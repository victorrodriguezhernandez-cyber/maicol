"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MUSCLE_GROUPS } from "@/lib/training/muscles";
import {
  getCompletedSetsForExercise,
  getRoutineWithDays,
} from "@/lib/data/training";
import { computeExerciseRecords, detectNewRecords, type NewRecord } from "@/lib/training/records";
import type { WorkoutSetRow } from "@/lib/training/types";

/**
 * Server Actions del apartado de entreno.
 *
 * Cada una empieza igual: valida con Zod y comprueba `auth.getUser()`.
 * Lo segundo es redundante con RLS a propósito — RLS es la red de
 * seguridad, esto es la puerta. Si un día una política se relaja por
 * error, estas comprobaciones siguen en pie.
 */

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

const muscleGroupSchema = z.enum(MUSCLE_GROUPS);
const equipmentSchema = z.enum([
  "barra", "mancuernas", "polea", "maquina", "peso_corporal",
  "kettlebell", "banda", "disco", "multipower", "otro",
]);
const mechanicSchema = z.enum(["compuesto", "aislamiento"]);
const patternSchema = z.enum([
  "empuje_horizontal", "empuje_vertical", "tiron_horizontal", "tiron_vertical",
  "dominante_rodilla", "dominante_cadera", "aislamiento_brazo",
  "aislamiento_hombro", "aislamiento_pierna", "core", "transporte",
]);
const setTypeSchema = z.enum(["calentamiento", "normal", "dropset", "backoff", "fallo"]);
const goalSchema = z.enum(["fuerza", "hipertrofia", "resistencia", "mantenimiento"]);
const sourceSchema = z.enum(["manual", "ia_chat", "ia_foto", "plantilla"]);

function revalidateTraining() {
  revalidatePath("/entreno");
  revalidatePath("/entreno/rutinas");
  revalidatePath("/entreno/musculos");
}

// =========================================================================
// Ejercicios propios
// =========================================================================

const exerciseInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  primaryMuscle: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema).max(6).default([]),
  equipment: equipmentSchema,
  mechanic: mechanicSchema,
  pattern: patternSchema,
  isUnilateral: z.boolean().default(false),
  defaultRepsMin: z.coerce.number().int().min(1).max(100).default(8),
  defaultRepsMax: z.coerce.number().int().min(1).max(100).default(12),
  defaultRestSeconds: z.coerce.number().int().min(0).max(900).default(90),
  cues: z.string().trim().max(1000).nullable().optional(),
});
export type ExerciseInput = z.input<typeof exerciseInputSchema>;

export async function createCustomExercise(input: ExerciseInput): Promise<string> {
  const parsed = exerciseInputSchema.parse(input);
  if (parsed.defaultRepsMax < parsed.defaultRepsMin) {
    throw new Error("El máximo de repeticiones no puede ser menor que el mínimo");
  }
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: parsed.name,
      // El trigger de la base de datos lo recalcula; se manda para
      // satisfacer el NOT NULL.
      name_normalized: parsed.name.toLowerCase(),
      primary_muscle: parsed.primaryMuscle,
      secondary_muscles: parsed.secondaryMuscles.filter((m) => m !== parsed.primaryMuscle),
      equipment: parsed.equipment,
      mechanic: parsed.mechanic,
      pattern: parsed.pattern,
      is_unilateral: parsed.isUnilateral,
      default_reps_min: parsed.defaultRepsMin,
      default_reps_max: parsed.defaultRepsMax,
      default_rest_seconds: parsed.defaultRestSeconds,
      cues: parsed.cues?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Ya tienes un ejercicio con ese nombre");
    throw error;
  }
  revalidatePath("/entreno/ejercicios");
  return data.id as string;
}

export async function updateCustomExercise(id: string, input: ExerciseInput) {
  const parsed = exerciseInputSchema.parse(input);
  const { supabase, user } = await requireUser();

  // Sólo los propios: el catálogo compartido no se toca desde el cliente.
  // RLS ya lo impide; esto lo dice con un mensaje entendible en vez de con
  // un "0 filas afectadas" silencioso.
  const { data: owned } = await supabase
    .from("exercises")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!owned) throw new Error("Ese ejercicio no existe");
  if (owned.user_id !== user.id) {
    throw new Error("Los ejercicios del catálogo no se pueden editar. Crea uno propio a partir de él.");
  }

  const { error } = await supabase
    .from("exercises")
    .update({
      name: parsed.name,
      primary_muscle: parsed.primaryMuscle,
      secondary_muscles: parsed.secondaryMuscles.filter((m) => m !== parsed.primaryMuscle),
      equipment: parsed.equipment,
      mechanic: parsed.mechanic,
      pattern: parsed.pattern,
      is_unilateral: parsed.isUnilateral,
      default_reps_min: parsed.defaultRepsMin,
      default_reps_max: parsed.defaultRepsMax,
      default_rest_seconds: parsed.defaultRestSeconds,
      cues: parsed.cues?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/entreno/ejercicios");
  revalidatePath(`/entreno/ejercicios/${id}`);
}

/**
 * Un ejercicio propio no se borra si ya se ha usado: se desactiva.
 *
 * Borrarlo dejaría huérfano el historial (la FK es `on delete restrict`,
 * así que ni siquiera dejaría), y perder las series de hace seis meses
 * porque hoy ya no haces ese ejercicio sería destruir datos reales.
 */
export async function deleteCustomExercise(id: string) {
  const { supabase, user } = await requireUser();

  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("exercise_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from("exercises")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    revalidatePath("/entreno/ejercicios");
    return { archived: true as const };
  }

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/entreno/ejercicios");
  return { archived: false as const };
}

// =========================================================================
// Rutinas
// =========================================================================

const routineExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  targetSets: z.coerce.number().int().min(1).max(20).default(3),
  targetRepsMin: z.coerce.number().int().min(1).max(100),
  targetRepsMax: z.coerce.number().int().min(1).max(100),
  targetRir: z.coerce.number().min(0).max(10).nullable().optional(),
  restSeconds: z.coerce.number().int().min(0).max(900).default(90),
  notes: z.string().trim().max(500).nullable().optional(),
  supersetGroup: z.string().regex(/^[A-Z]$/).nullable().optional(),
});

const routineDayInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(500).nullable().optional(),
  exercises: z.array(routineExerciseInputSchema).max(30),
});

const routineInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: goalSchema.default("hipertrofia"),
  notes: z.string().trim().max(2000).nullable().optional(),
  source: sourceSchema.default("manual"),
  days: z.array(routineDayInputSchema).min(1).max(14),
});
export type RoutineInput = z.input<typeof routineInputSchema>;

/**
 * Crea una rutina entera de una vez: cabecera, días y ejercicios.
 *
 * Es la única vía de escritura de rutinas, la use el editor manual, el
 * chat con la IA o el importador de fotos. Que las tres pasen por la misma
 * validación es lo que impide que la IA meta una rutina que el editor
 * rechazaría (regla 4 del proyecto).
 *
 * Los `exerciseId` se comprueban contra la base de datos antes de
 * escribir: un id que el modelo se haya inventado no llega a insertarse.
 */
export async function createRoutine(input: RoutineInput): Promise<string> {
  const parsed = routineInputSchema.parse(input);
  const { supabase, user } = await requireUser();

  const requestedIds = [
    ...new Set(parsed.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))),
  ];
  if (requestedIds.length > 0) {
    const { data: found, error: findError } = await supabase
      .from("exercises")
      .select("id")
      .in("id", requestedIds);
    if (findError) throw findError;
    const known = new Set((found ?? []).map((f) => f.id as string));
    const missing = requestedIds.filter((id) => !known.has(id));
    if (missing.length > 0) {
      throw new Error(
        `La rutina referencia ${missing.length} ejercicio(s) que no existen en el catálogo.`,
      );
    }
  }

  for (const day of parsed.days) {
    for (const ex of day.exercises) {
      if (ex.targetRepsMax < ex.targetRepsMin) {
        throw new Error(`En "${day.name}" hay un rango de repeticiones al revés.`);
      }
    }
  }

  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: parsed.name,
      goal: parsed.goal,
      notes: parsed.notes?.trim() || null,
      source: parsed.source,
    })
    .select("id")
    .single();
  if (error) throw error;
  const routineId = routine.id as string;

  // Si algo falla a partir de aquí, la rutina a medias se borra. No hay
  // transacción a través de PostgREST, así que el rollback es explícito:
  // una rutina con la mitad de los días es peor que ninguna.
  try {
    const { data: days, error: daysError } = await supabase
      .from("routine_days")
      .insert(
        parsed.days.map((d, i) => ({
          routine_id: routineId,
          position: i + 1,
          name: d.name,
          notes: d.notes?.trim() || null,
        })),
      )
      .select("id, position");
    if (daysError) throw daysError;

    const dayIdByPosition = new Map(
      (days ?? []).map((d) => [d.position as number, d.id as string]),
    );

    const exerciseRows = parsed.days.flatMap((d, dayIndex) =>
      d.exercises.map((e, i) => ({
        routine_day_id: dayIdByPosition.get(dayIndex + 1)!,
        exercise_id: e.exerciseId,
        position: i + 1,
        target_sets: e.targetSets,
        target_reps_min: e.targetRepsMin,
        target_reps_max: e.targetRepsMax,
        target_rir: e.targetRir ?? null,
        rest_seconds: e.restSeconds,
        notes: e.notes?.trim() || null,
        superset_group: e.supersetGroup ?? null,
      })),
    );

    if (exerciseRows.length > 0) {
      const { error: exError } = await supabase.from("routine_exercises").insert(exerciseRows);
      if (exError) throw exError;
    }
  } catch (e) {
    await supabase.from("routines").delete().eq("id", routineId).eq("user_id", user.id);
    throw e;
  }

  revalidateTraining();
  return routineId;
}

const routineMetaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: goalSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function updateRoutineMeta(routineId: string, input: z.infer<typeof routineMetaSchema>) {
  const parsed = routineMetaSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routines")
    .update({ name: parsed.name, goal: parsed.goal, notes: parsed.notes?.trim() || null })
    .eq("id", routineId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidateTraining();
  revalidatePath(`/entreno/rutinas/${routineId}`);
}

/**
 * Marca una rutina como la activa. Desactiva la anterior primero porque
 * hay un índice único que sólo permite una: sin este paso el UPDATE
 * fallaría con un 23505 en vez de hacer lo obvio.
 */
export async function setActiveRoutine(routineId: string) {
  const { supabase, user } = await requireUser();

  const { error: clearError } = await supabase
    .from("routines")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (clearError) throw clearError;

  const { error } = await supabase
    .from("routines")
    .update({ is_active: true })
    .eq("id", routineId)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidateTraining();
}

export async function archiveRoutine(routineId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routines")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", routineId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidateTraining();
}

export async function unarchiveRoutine(routineId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routines")
    .update({ archived_at: null })
    .eq("id", routineId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidateTraining();
}

/**
 * Borra la rutina. Las sesiones ya entrenadas con ella NO se pierden: la
 * FK de `training_sessions.routine_id` es `on delete set null`, así que el
 * historial se queda, sólo deja de apuntar a un plan que ya no existe.
 */
export async function deleteRoutine(routineId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidateTraining();
}

export async function duplicateRoutine(routineId: string): Promise<string> {
  const { supabase } = await requireUser();
  const original = await getRoutineWithDays(supabase, routineId);
  if (!original) throw new Error("Esa rutina no existe");

  return createRoutine({
    name: `${original.name} (copia)`.slice(0, 120),
    goal: original.goal,
    notes: original.notes,
    source: original.source,
    days: original.routine_days.map((d) => ({
      name: d.name,
      notes: d.notes,
      exercises: d.routine_exercises.map((e) => ({
        exerciseId: e.exercise_id,
        targetSets: e.target_sets,
        targetRepsMin: e.target_reps_min,
        targetRepsMax: e.target_reps_max,
        targetRir: e.target_rir,
        restSeconds: e.rest_seconds,
        notes: e.notes,
        supersetGroup: e.superset_group,
      })),
    })),
  });
}

// --- Edición fina de un día ya existente --------------------------------

export async function addRoutineDay(routineId: string, name: string) {
  const parsedName = z.string().trim().min(1).max(60).parse(name);
  const { supabase, user } = await requireUser();

  const { data: owner } = await supabase
    .from("routines").select("user_id").eq("id", routineId).maybeSingle();
  if (owner?.user_id !== user.id) throw new Error("Esa rutina no es tuya");

  const { data: last } = await supabase
    .from("routine_days")
    .select("position")
    .eq("routine_id", routineId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("routine_days").insert({
    routine_id: routineId,
    position: ((last?.position as number) ?? 0) + 1,
    name: parsedName,
  });
  if (error) throw error;
  revalidatePath(`/entreno/rutinas/${routineId}`);
}

export async function deleteRoutineDay(dayId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("routine_days").delete().eq("id", dayId);
  if (error) throw error;
  revalidateTraining();
}

const addRoutineExerciseSchema = routineExerciseInputSchema.extend({
  routineDayId: z.string().uuid(),
});

export async function addRoutineExercise(input: z.input<typeof addRoutineExerciseSchema>) {
  const parsed = addRoutineExerciseSchema.parse(input);
  if (parsed.targetRepsMax < parsed.targetRepsMin) {
    throw new Error("El máximo de repeticiones no puede ser menor que el mínimo");
  }
  const { supabase } = await requireUser();

  const { data: last } = await supabase
    .from("routine_exercises")
    .select("position")
    .eq("routine_day_id", parsed.routineDayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("routine_exercises").insert({
    routine_day_id: parsed.routineDayId,
    exercise_id: parsed.exerciseId,
    position: ((last?.position as number) ?? 0) + 1,
    target_sets: parsed.targetSets,
    target_reps_min: parsed.targetRepsMin,
    target_reps_max: parsed.targetRepsMax,
    target_rir: parsed.targetRir ?? null,
    rest_seconds: parsed.restSeconds,
    notes: parsed.notes?.trim() || null,
    superset_group: parsed.supersetGroup ?? null,
  });
  if (error) throw error;
  revalidateTraining();
}

export async function updateRoutineExercise(
  id: string,
  input: z.input<typeof routineExerciseInputSchema>,
) {
  const parsed = routineExerciseInputSchema.parse(input);
  if (parsed.targetRepsMax < parsed.targetRepsMin) {
    throw new Error("El máximo de repeticiones no puede ser menor que el mínimo");
  }
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("routine_exercises")
    .update({
      target_sets: parsed.targetSets,
      target_reps_min: parsed.targetRepsMin,
      target_reps_max: parsed.targetRepsMax,
      target_rir: parsed.targetRir ?? null,
      rest_seconds: parsed.restSeconds,
      notes: parsed.notes?.trim() || null,
      superset_group: parsed.supersetGroup ?? null,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateTraining();
}

export async function deleteRoutineExercise(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("routine_exercises").delete().eq("id", id);
  if (error) throw error;
  revalidateTraining();
}

/**
 * Reordena los ejercicios de un día.
 *
 * En dos pasadas: primero a posiciones negativas, luego a las
 * definitivas. El `unique (routine_day_id, position)` haría chocar
 * cualquier intercambio hecho de una sola vez — mover el 3 al 1 con el 1
 * todavía ahí es un 23505 garantizado.
 */
export async function reorderRoutineExercises(dayId: string, orderedIds: string[]) {
  const ids = z.array(z.string().uuid()).min(1).max(30).parse(orderedIds);
  const { supabase } = await requireUser();

  for (const [i, id] of ids.entries()) {
    const { error } = await supabase
      .from("routine_exercises")
      .update({ position: -(i + 1) })
      .eq("id", id)
      .eq("routine_day_id", dayId);
    if (error) throw error;
  }
  for (const [i, id] of ids.entries()) {
    const { error } = await supabase
      .from("routine_exercises")
      .update({ position: i + 1 })
      .eq("id", id)
      .eq("routine_day_id", dayId);
    if (error) throw error;
  }
  revalidateTraining();
}

// =========================================================================
// Sesiones
// =========================================================================

const startSessionSchema = z.object({
  routineDayId: z.string().uuid().nullable().optional(),
  title: z.string().trim().max(120).nullable().optional(),
});

/**
 * Abre una sesión de entreno.
 *
 * Si viene de un día de rutina, deja las series planificadas ya creadas y
 * SIN completar: así al llegar al gimnasio la tabla está puesta y sólo
 * hay que rellenar kilos y repeticiones. Una serie sin `completed_at` no
 * cuenta para nada — ni volumen, ni récords, ni historial — así que un
 * entreno que se abandone a medias no ensucia ninguna estadística.
 *
 * Sólo puede haber una sesión abierta (índice único en la migración). Si
 * ya hay una, se devuelve esa en vez de fallar: abrir la app en el
 * gimnasio y que te diga "error" porque no cerraste la de ayer sería
 * absurdo.
 */
export async function startSession(
  input: z.input<typeof startSessionSchema> = {},
): Promise<{ sessionId: string; resumed: boolean }> {
  const parsed = startSessionSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: open } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "en_curso")
    .maybeSingle();
  if (open) return { sessionId: open.id as string, resumed: true };

  // Peso corporal del día, para los ejercicios de peso corporal. Si no hay
  // ningún pesaje, se queda a null y la app lo dice en vez de inventarlo.
  const { data: lastWeight } = await supabase
    .from("weight_entries")
    .select("weight_kg")
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let routineId: string | null = null;
  let title = parsed.title?.trim() || null;
  let planned: {
    exercise_id: string;
    position: number;
    target_sets: number;
    rest_seconds: number;
  }[] = [];

  if (parsed.routineDayId) {
    const { data: day } = await supabase
      .from("routine_days")
      .select("id, name, routine_id, routines(id, name)")
      .eq("id", parsed.routineDayId)
      .maybeSingle();
    if (!day) throw new Error("Ese día de rutina no existe");

    routineId = day.routine_id as string;
    title = title ?? (day.name as string);

    const { data: exercises, error: exError } = await supabase
      .from("routine_exercises")
      .select("exercise_id, position, target_sets, rest_seconds")
      .eq("routine_day_id", parsed.routineDayId)
      .order("position");
    if (exError) throw exError;
    planned = (exercises ?? []) as typeof planned;
  }

  const now = new Date();
  const { data: session, error } = await supabase
    .from("training_sessions")
    .insert({
      user_id: user.id,
      session_date: localDateString(now),
      title: title ?? "Entreno libre",
      routine_id: routineId,
      routine_day_id: parsed.routineDayId ?? null,
      status: "en_curso",
      started_at: now.toISOString(),
      bodyweight_kg: (lastWeight?.weight_kg as number | undefined) ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  const sessionId = session.id as string;

  if (planned.length > 0) {
    const rows = planned.flatMap((p) =>
      Array.from({ length: p.target_sets }, (_, i) => ({
        session_id: sessionId,
        exercise_id: p.exercise_id,
        exercise_position: p.position,
        set_number: i + 1,
        set_type: "normal" as const,
      })),
    );
    const { error: setsError } = await supabase.from("workout_sets").insert(rows);
    if (setsError) {
      await supabase.from("training_sessions").delete().eq("id", sessionId);
      throw setsError;
    }
  }

  revalidateTraining();
  return { sessionId, resumed: false };
}

/** YYYY-MM-DD en la zona del dispositivo, no en UTC. */
function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function addExerciseToSession(sessionId: string, exerciseId: string) {
  const { supabase } = await requireUser();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("default_reps_min, default_reps_max")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!exercise) throw new Error("Ese ejercicio no existe");

  const { data: last } = await supabase
    .from("workout_sets")
    .select("exercise_position")
    .eq("session_id", sessionId)
    .order("exercise_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((last?.exercise_position as number) ?? 0) + 1;

  // Tres series vacías: el arranque razonable. El usuario añade o quita.
  const { error } = await supabase.from("workout_sets").insert(
    Array.from({ length: 3 }, (_, i) => ({
      session_id: sessionId,
      exercise_id: exerciseId,
      exercise_position: position,
      set_number: i + 1,
      set_type: "normal" as const,
    })),
  );
  if (error) throw error;
  revalidatePath(`/entreno/sesion/${sessionId}`);
}

export async function removeExerciseFromSession(sessionId: string, exercisePosition: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("session_id", sessionId)
    .eq("exercise_position", exercisePosition);
  if (error) throw error;
  revalidatePath(`/entreno/sesion/${sessionId}`);
}

export async function addSetToExercise(sessionId: string, exercisePosition: number, setType: string = "normal") {
  const parsedType = setTypeSchema.parse(setType);
  const { supabase } = await requireUser();

  const { data: rows, error: readError } = await supabase
    .from("workout_sets")
    .select("exercise_id, set_number")
    .eq("session_id", sessionId)
    .eq("exercise_position", exercisePosition)
    .order("set_number", { ascending: false })
    .limit(1);
  if (readError) throw readError;
  const last = rows?.[0];
  if (!last) throw new Error("Ese ejercicio no está en la sesión");

  const { error } = await supabase.from("workout_sets").insert({
    session_id: sessionId,
    exercise_id: last.exercise_id as string,
    exercise_position: exercisePosition,
    set_number: (last.set_number as number) + 1,
    set_type: parsedType,
  });
  if (error) throw error;
  revalidatePath(`/entreno/sesion/${sessionId}`);
}

const logSetSchema = z.object({
  setId: z.string().uuid(),
  weightKg: z.coerce.number().min(0).max(999.99).nullable().optional(),
  reps: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  durationSeconds: z.coerce.number().int().min(0).max(86400).nullable().optional(),
  rir: z.coerce.number().min(0).max(10).nullable().optional(),
  setType: setTypeSchema.optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  restTakenSeconds: z.coerce.number().int().min(0).max(3600).nullable().optional(),
  /** Marcar la serie como hecha. Al desmarcarla se borra `completed_at`. */
  completed: z.boolean(),
});
export type LogSetInput = z.input<typeof logSetSchema>;

/**
 * Guarda una serie. Es la acción que más se usa de toda la app, y la
 * única que devuelve algo además de escribir: los récords que acaba de
 * batir, para poder enseñarlos en el momento.
 *
 * Los récords se calculan con el historial SIN esta serie
 * (`excludeSetId`), porque si no la serie nueva se compararía consigo
 * misma y nunca sería un récord.
 */
export async function logSet(
  input: LogSetInput,
): Promise<{ set: WorkoutSetRow; records: NewRecord[] }> {
  const parsed = logSetSchema.parse(input);
  const { supabase } = await requireUser();

  const { data: existing, error: readError } = await supabase
    .from("workout_sets")
    .select("id, exercise_id, session_id")
    .eq("id", parsed.setId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Esa serie no existe");

  const completedAt = parsed.completed ? new Date().toISOString() : null;

  const { data: updated, error } = await supabase
    .from("workout_sets")
    .update({
      weight_kg: parsed.weightKg ?? null,
      reps: parsed.reps ?? null,
      duration_seconds: parsed.durationSeconds ?? null,
      rir: parsed.rir ?? null,
      ...(parsed.setType ? { set_type: parsed.setType } : {}),
      notes: parsed.notes?.trim() || null,
      rest_taken_seconds: parsed.restTakenSeconds ?? null,
      completed_at: completedAt,
    })
    .eq("id", parsed.setId)
    .select("*")
    .single();
  if (error) throw error;

  const set = updated as WorkoutSetRow;

  let records: NewRecord[] = [];
  if (parsed.completed) {
    const history = await getCompletedSetsForExercise(
      supabase,
      existing.exercise_id as string,
      parsed.setId,
    );
    records = detectNewRecords(
      {
        id: set.id,
        weightKg: set.weight_kg,
        reps: set.reps,
        durationSeconds: set.duration_seconds,
        setType: set.set_type,
        completedAt: set.completed_at ?? new Date().toISOString(),
        sessionId: set.session_id,
      },
      computeExerciseRecords(history),
    );
  }

  // Nada de revalidatePath aquí: esta acción se llama una vez por serie,
  // en medio del entreno, y la pantalla ya lleva su propio estado
  // optimista. Revalidar en cada pulsación tiraría el formulario abierto.
  return { set, records };
}

export async function deleteSet(setId: string) {
  const { supabase } = await requireUser();
  const { data: set } = await supabase
    .from("workout_sets").select("session_id").eq("id", setId).maybeSingle();
  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) throw error;
  if (set) revalidatePath(`/entreno/sesion/${set.session_id}`);
}

const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  perceivedEffort: z.coerce.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

/**
 * Cierra la sesión.
 *
 * Antes de cerrar borra las series que quedaron sin completar: son las
 * que la rutina había planificado y no llegaste a hacer. Dejarlas
 * guardadas como filas vacías haría que el historial enseñara series
 * fantasma de 0 kg que nunca ocurrieron.
 */
export async function finishSession(input: z.input<typeof finishSessionSchema>) {
  const parsed = finishSessionSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: session } = await supabase
    .from("training_sessions")
    .select("started_at, user_id")
    .eq("id", parsed.sessionId)
    .maybeSingle();
  if (!session || session.user_id !== user.id) throw new Error("Esa sesión no es tuya");

  const { error: cleanupError } = await supabase
    .from("workout_sets")
    .delete()
    .eq("session_id", parsed.sessionId)
    .is("completed_at", null);
  if (cleanupError) throw cleanupError;

  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("session_id", parsed.sessionId);

  // Una sesión sin una sola serie hecha no es un entreno: se descarta
  // entera en vez de dejar un día vacío en el historial.
  if ((count ?? 0) === 0) {
    await supabase.from("training_sessions").delete().eq("id", parsed.sessionId);
    revalidateTraining();
    return { discarded: true as const };
  }

  const finishedAt = new Date();
  const startedAt = session.started_at ? new Date(session.started_at as string) : null;
  const durationMin = startedAt
    ? Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000))
    : null;

  const { error } = await supabase
    .from("training_sessions")
    .update({
      status: "completada",
      finished_at: finishedAt.toISOString(),
      duration_min: durationMin,
      perceived_effort: parsed.perceivedEffort ?? null,
      notes: parsed.notes?.trim() || null,
    })
    .eq("id", parsed.sessionId)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidateTraining();
  return { discarded: false as const };
}

/** Tira la sesión abierta entera. Sólo vale sobre una `en_curso`. */
export async function discardSession(sessionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "en_curso");
  if (error) throw error;
  revalidateTraining();
}

export async function deleteSession(sessionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidateTraining();
}
