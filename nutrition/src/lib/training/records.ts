/**
 * Récords personales y 1RM estimado.
 *
 * Nada de esto se guarda en base de datos: se deriva de `workout_sets`
 * cada vez que se pide (ver la cabecera de la migración 0005). Así una
 * serie corregida corrige también el récord, en vez de dejar un PR
 * fantasma que ya no corresponde a ninguna serie real.
 */

/** Una serie ya completada, tal y como sale de la base de datos. */
export interface CompletedSet {
  id: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  setType: string;
  completedAt: string;
  sessionId: string;
}

/**
 * Tipos de serie que no optan a récord de peso.
 *
 *   calentamiento → no es un intento real.
 *   dropset       → se hace con fatiga acumulada de la serie anterior,
 *                   así que su peso no es comparable con una serie fresca.
 *                   Sigue contando para el volumen, pero no para el PR.
 */
const NON_PR_SET_TYPES = new Set(["calentamiento", "dropset"]);

export function countsForRecords(set: CompletedSet): boolean {
  return !NON_PR_SET_TYPES.has(set.setType);
}

/**
 * 1RM estimado a partir de un peso y unas repeticiones (fórmula de Epley).
 *
 *     1RM ≈ peso × (1 + reps / 30)
 *
 * Con 1 repetición devuelve el peso tal cual, que es lo correcto.
 *
 * ── Su límite, que la app enseña en vez de esconder ──────────────────
 *
 * La fórmula es razonable hasta unas 10-12 repeticiones. A partir de ahí
 * el error crece rápido, porque aguantar muchas repeticiones depende de
 * la resistencia y del tipo de fibra tanto como de la fuerza máxima. Por
 * eso `estimateOneRepMax` devuelve `null` por encima de 12: preferimos no
 * dar un número a dar uno que suena preciso y no lo es (regla 9 del
 * proyecto — nada simulado).
 *
 * También devuelve null si la serie no lleva peso (ejercicios de tiempo,
 * o peso corporal sin lastre): un 1RM de una plancha no significa nada.
 */
export const ONE_RM_MAX_REPS = 12;

export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isInteger(reps) || reps < 1) return null;
  if (reps > ONE_RM_MAX_REPS) return null;
  return weightKg * (1 + reps / 30);
}

export interface ExerciseRecords {
  /** El peso más alto movido, con las repeticiones que se hicieron. */
  heaviest: { weightKg: number; reps: number; at: string; setId: string } | null;
  /** El mejor 1RM estimado, y de qué serie salió. */
  bestEstimatedOneRm: {
    value: number;
    weightKg: number;
    reps: number;
    at: string;
    setId: string;
  } | null;
  /** La serie de más repeticiones, sea cual sea el peso. */
  mostReps: { reps: number; weightKg: number | null; at: string; setId: string } | null;
  /** El aguante más largo, para los ejercicios que se miden en tiempo. */
  longestHold: { durationSeconds: number; at: string; setId: string } | null;
  /** Más volumen (peso × reps) sumado en una sola sesión. */
  bestSessionVolume: { volumeKg: number; sessionId: string; at: string } | null;
  /** Cuántas series completadas hay en total, para saber si fiarse. */
  totalSets: number;
}

export function computeExerciseRecords(sets: CompletedSet[]): ExerciseRecords {
  const eligible = sets.filter(countsForRecords);

  let heaviest: ExerciseRecords["heaviest"] = null;
  let bestOneRm: ExerciseRecords["bestEstimatedOneRm"] = null;
  let mostReps: ExerciseRecords["mostReps"] = null;
  let longestHold: ExerciseRecords["longestHold"] = null;
  const sessionVolume = new Map<string, { volumeKg: number; at: string }>();

  for (const s of eligible) {
    if (s.weightKg != null && s.reps != null && s.reps > 0) {
      // Empate a peso: gana el que hizo más repeticiones, que es
      // objetivamente el mejor levantamiento.
      if (
        !heaviest ||
        s.weightKg > heaviest.weightKg ||
        (s.weightKg === heaviest.weightKg && s.reps > heaviest.reps)
      ) {
        heaviest = { weightKg: s.weightKg, reps: s.reps, at: s.completedAt, setId: s.id };
      }

      const oneRm = estimateOneRepMax(s.weightKg, s.reps);
      if (oneRm != null && (!bestOneRm || oneRm > bestOneRm.value)) {
        bestOneRm = {
          value: oneRm,
          weightKg: s.weightKg,
          reps: s.reps,
          at: s.completedAt,
          setId: s.id,
        };
      }
    }

    if (s.reps != null && s.reps > 0) {
      // Empate a repeticiones: gana el que llevaba más peso.
      if (
        !mostReps ||
        s.reps > mostReps.reps ||
        (s.reps === mostReps.reps && (s.weightKg ?? 0) > (mostReps.weightKg ?? 0))
      ) {
        mostReps = { reps: s.reps, weightKg: s.weightKg, at: s.completedAt, setId: s.id };
      }
    }

    if (s.durationSeconds != null && s.durationSeconds > 0) {
      if (!longestHold || s.durationSeconds > longestHold.durationSeconds) {
        longestHold = { durationSeconds: s.durationSeconds, at: s.completedAt, setId: s.id };
      }
    }

    if (s.weightKg != null && s.reps != null) {
      const prev = sessionVolume.get(s.sessionId);
      const add = s.weightKg * s.reps;
      sessionVolume.set(s.sessionId, {
        volumeKg: (prev?.volumeKg ?? 0) + add,
        at: prev?.at ?? s.completedAt,
      });
    }
  }

  let bestSessionVolume: ExerciseRecords["bestSessionVolume"] = null;
  for (const [sessionId, v] of sessionVolume) {
    if (!bestSessionVolume || v.volumeKg > bestSessionVolume.volumeKg) {
      bestSessionVolume = { volumeKg: v.volumeKg, sessionId, at: v.at };
    }
  }

  return {
    heaviest,
    bestEstimatedOneRm: bestOneRm,
    mostReps,
    longestHold,
    bestSessionVolume,
    totalSets: eligible.length,
  };
}

export type PersonalRecordKind = "peso" | "reps" | "1rm" | "tiempo";

export interface NewRecord {
  kind: PersonalRecordKind;
  /** Una frase lista para enseñar: "Nuevo récord: 82,5 kg × 5". */
  message: string;
  /** Lo que había antes, para poder decir cuánto ha mejorado. */
  previous: string | null;
}

/**
 * Comprueba si una serie recién completada bate algún récord.
 *
 * `previous` son los récords calculados SIN esta serie. Se llama justo
 * después de guardar, con el historial anterior, para poder enseñar el
 * "¡PR!" en el momento.
 *
 * Sólo devuelve récords de verdad: si es la primera serie de ese
 * ejercicio no devuelve nada. Celebrar la primera vez que haces algo es
 * ruido, no un logro — y hace que el badge deje de significar nada.
 */
export function detectNewRecords(
  set: CompletedSet,
  previous: ExerciseRecords,
): NewRecord[] {
  if (!countsForRecords(set)) return [];
  if (previous.totalSets === 0) return [];

  const found: NewRecord[] = [];

  if (set.weightKg != null && set.reps != null && set.reps > 0) {
    if (previous.heaviest && set.weightKg > previous.heaviest.weightKg) {
      found.push({
        kind: "peso",
        message: `Nuevo récord de peso: ${formatKg(set.weightKg)} kg × ${set.reps}`,
        previous: `${formatKg(previous.heaviest.weightKg)} kg × ${previous.heaviest.reps}`,
      });
    }

    const oneRm = estimateOneRepMax(set.weightKg, set.reps);
    if (
      oneRm != null &&
      previous.bestEstimatedOneRm &&
      // Un margen de 0,5 kg para no cantar un récord por una diferencia
      // que es ruido de la fórmula, no fuerza nueva.
      oneRm > previous.bestEstimatedOneRm.value + 0.5 &&
      // Si ya ha salido el récord de peso, no lo cantamos dos veces con
      // otro nombre.
      !found.some((f) => f.kind === "peso")
    ) {
      found.push({
        kind: "1rm",
        message: `Mejor marca estimada: ${formatKg(oneRm)} kg de máximo`,
        previous: `${formatKg(previous.bestEstimatedOneRm.value)} kg`,
      });
    }

    if (
      previous.mostReps &&
      set.reps > previous.mostReps.reps &&
      !found.length
    ) {
      found.push({
        kind: "reps",
        message: `Nuevo récord de repeticiones: ${set.reps} × ${formatKg(set.weightKg)} kg`,
        previous: `${previous.mostReps.reps} repeticiones`,
      });
    }
  }

  if (
    set.durationSeconds != null &&
    previous.longestHold &&
    set.durationSeconds > previous.longestHold.durationSeconds
  ) {
    found.push({
      kind: "tiempo",
      message: `Nuevo récord de tiempo: ${formatDuration(set.durationSeconds)}`,
      previous: formatDuration(previous.longestHold.durationSeconds),
    });
  }

  return found;
}

/** 82,5 en vez de 82.5; 80 en vez de 80,00. */
export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 100) / 100;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)).replace(".", ",");
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

/**
 * Volumen de una sesión: la suma de peso × repeticiones de cada serie que
 * cuenta. Es la métrica más honesta de "cuánto trabajo he hecho hoy",
 * mucho mejor que contar series a secas, porque distingue 5 series de 100
 * kg de 5 series de 20.
 *
 * Las series sin peso (tiempo, peso corporal sin lastre) no suman: no hay
 * forma de convertirlas a kilos sin inventarse el peso corporal del
 * momento, y mezclarlo haría el número incomparable entre sesiones.
 */
export function sessionVolumeKg(sets: CompletedSet[]): number {
  let total = 0;
  for (const s of sets) {
    if (s.setType === "calentamiento") continue;
    if (s.weightKg == null || s.reps == null) continue;
    total += s.weightKg * s.reps;
  }
  return total;
}
