"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  logSet,
  addSetToExercise,
  deleteSet,
  addExerciseToSession,
  removeExerciseFromSession,
  finishSession,
  discardSession,
} from "@/lib/actions/training";
import type {
  SessionExercise,
  TrainingSessionRow,
  WorkoutSetRow,
  SetType,
} from "@/lib/training/types";
import { isTimeBased, SET_TYPE_LABELS, numberWorkingSets } from "@/lib/training/types";
import type { NewRecord } from "@/lib/training/records";
import { formatKg } from "@/lib/training/records";
import { RestTimer } from "./RestTimer";
import { ExercisePicker } from "./ExercisePicker";
import { Sheet } from "@/components/ui/Sheet";
import {
  CheckIcon,
  PlusIcon,
  TrophyIcon,
  TrashIcon,
  CloseIcon,
} from "@/components/ui/icons";

/**
 * El registro de un entreno en directo.
 *
 * ── Por qué todo el estado vive aquí y no se recarga del servidor ──────
 *
 * Esta pantalla se usa de pie, con una mano, entre serie y serie, muchas
 * veces con mala cobertura. Si cada pulsación esperara al servidor y
 * volviera a pintar, el teclado se cerraría, el scroll saltaría y marcar
 * una serie tardaría lo que tarde la red.
 *
 * Así que el estado es local y optimista: al marcar una serie se pinta
 * hecha al instante y la escritura va detrás. Si falla, la serie vuelve a
 * su sitio y sale el aviso — nunca se deja marcada una serie que no se
 * guardó, porque entonces el historial diría una cosa y la pantalla otra.
 */

interface DraftSet extends WorkoutSetRow {
  /** Guardando ahora mismo: el check se atenúa pero no se bloquea. */
  saving?: boolean;
}

/** Lo que se puede cambiar de una serie en una sola escritura. */
interface SetPatch {
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  rir?: number | null;
  notes?: string | null;
  setType?: SetType;
}

/**
 * Guardar una serie. La firma se comparte entre las tres capas de la
 * pantalla (tarjeta → fila → hoja de detalle) para que la lógica de
 * guardado viva en un solo sitio: el componente de arriba.
 */
type SaveSet = (
  set: DraftSet,
  patch: SetPatch,
  completed: boolean,
  restSeconds?: number,
  exerciseName?: string,
) => void;

export function SessionLogger({
  session,
  exercises: initialExercises,
}: {
  session: TrainingSessionRow;
  exercises: SessionExercise[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(() =>
    initialExercises.map((e) => ({ ...e, sets: e.sets as DraftSet[] })),
  );
  const [rest, setRest] = useState<{ endsAt: number; label: string } | null>(null);
  const [records, setRecords] = useState<NewRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const completedCount = useMemo(
    () =>
      exercises.reduce(
        (n, ex) => n + ex.sets.filter((s) => s.completed_at && s.set_type !== "calentamiento").length,
        0,
      ),
    [exercises],
  );
  const totalCount = useMemo(
    () => exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.set_type !== "calentamiento").length, 0),
    [exercises],
  );

  const patchSet = useCallback((setId: string, patch: Partial<DraftSet>) => {
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      })),
    );
  }, []);

  /**
   * Guarda una serie. `completed` decide si además cuenta como hecha.
   *
   * El estado optimista se aplica antes de llamar y se revierte si la
   * acción falla, usando el valor que la fila tenía justo antes.
   */
  const saveSet = useCallback(
    async (
      set: DraftSet,
      patch: SetPatch,
      completed: boolean,
      restSeconds?: number,
      exerciseName?: string,
    ) => {
      const before = { ...set };
      patchSet(set.id, {
        ...(patch.weightKg !== undefined ? { weight_kg: patch.weightKg } : {}),
        ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
        ...(patch.durationSeconds !== undefined ? { duration_seconds: patch.durationSeconds } : {}),
        ...(patch.rir !== undefined ? { rir: patch.rir } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.setType !== undefined ? { set_type: patch.setType } : {}),
        completed_at: completed ? new Date().toISOString() : null,
        saving: true,
      });
      setError(null);

      try {
        const result = await logSet({
          setId: set.id,
          weightKg: patch.weightKg !== undefined ? patch.weightKg : set.weight_kg,
          reps: patch.reps !== undefined ? patch.reps : set.reps,
          durationSeconds:
            patch.durationSeconds !== undefined ? patch.durationSeconds : set.duration_seconds,
          rir: patch.rir !== undefined ? patch.rir : set.rir,
          notes: patch.notes !== undefined ? patch.notes : set.notes,
          setType: patch.setType ?? (set.set_type as SetType),
          completed,
        });
        patchSet(set.id, { ...result.set, saving: false });

        if (completed && restSeconds && restSeconds > 0) {
          setRest({ endsAt: Date.now() + restSeconds * 1000, label: exerciseName ?? "" });
        }
        if (result.records.length > 0) setRecords(result.records);
      } catch (e) {
        patchSet(set.id, { ...before, saving: false });
        setError(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "Sin conexión: esa serie no se ha guardado. Vuelve a marcarla cuando tengas cobertura."
            : e instanceof Error
              ? e.message
              : "No se ha podido guardar la serie.",
        );
      }
    },
    [patchSet],
  );

  function handleAddSet(exercisePosition: number) {
    startTransition(async () => {
      try {
        await addSetToExercise(session.id, exercisePosition);
        router.refresh();
      } catch {
        setError("No se ha podido añadir la serie.");
      }
    });
  }

  function handleDeleteSet(setId: string) {
    setExercises((prev) =>
      prev.map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.id !== setId) })),
    );
    startTransition(async () => {
      try {
        await deleteSet(setId);
      } catch {
        setError("No se ha podido borrar la serie.");
        router.refresh();
      }
    });
  }

  function handleAddExercise(exerciseId: string) {
    setPickerOpen(false);
    startTransition(async () => {
      try {
        await addExerciseToSession(session.id, exerciseId);
        router.refresh();
      } catch {
        setError("No se ha podido añadir el ejercicio.");
      }
    });
  }

  function handleRemoveExercise(position: number) {
    startTransition(async () => {
      try {
        await removeExerciseFromSession(session.id, position);
        router.refresh();
      } catch {
        setError("No se ha podido quitar el ejercicio.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-meta">Entreno en curso</p>
          <h1 className="text-hero-title truncate text-[1.6rem] text-[var(--text-primary)]">
            {session.title ?? "Entreno"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {completedCount} de {totalCount} series hechas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFinishOpen(true)}
          className="btn-primary tap-scale shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-[var(--accent-fg)]"
        >
          Terminar
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}

      {exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Este entreno todavía no tiene ejercicios
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Añade el primero y empieza a registrar series.
          </p>
        </div>
      ) : (
        exercises.map((ex) => (
          <ExerciseCard
            key={`${ex.position}-${ex.exercise.id}`}
            entry={ex}
            onSave={saveSet}
            onAddSet={() => handleAddSet(ex.position)}
            onDeleteSet={handleDeleteSet}
            onRemove={() => handleRemoveExercise(ex.position)}
          />
        ))
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={pending}
        className="btn-secondary tap-scale flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]"
      >
        <PlusIcon size={16} /> Añadir ejercicio
      </button>

      <button
        type="button"
        onClick={() => {
          if (!confirm("¿Descartar este entreno? Se pierde todo lo registrado.")) return;
          startTransition(async () => {
            await discardSession(session.id);
            router.push("/entreno");
          });
        }}
        className="text-center text-xs font-medium text-[var(--text-tertiary)]"
      >
        Descartar este entreno
      </button>

      {rest ? (
        <RestTimer
          endsAt={rest.endsAt}
          label={rest.label}
          onDismiss={() => setRest(null)}
          onExtend={(s) => setRest((r) => (r ? { ...r, endsAt: r.endsAt + s * 1000 } : r))}
        />
      ) : null}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handleAddExercise}
      />

      <RecordsSheet records={records} onClose={() => setRecords(null)} />

      <FinishSheet
        open={finishOpen}
        onOpenChange={setFinishOpen}
        completedCount={completedCount}
        onFinish={(effort, notes) =>
          startTransition(async () => {
            try {
              const result = await finishSession({
                sessionId: session.id,
                perceivedEffort: effort,
                notes,
              });
              router.push(result.discarded ? "/entreno" : `/entreno/sesion/${session.id}`);
              router.refresh();
            } catch {
              setError("No se ha podido cerrar el entreno.");
              setFinishOpen(false);
            }
          })
        }
      />
    </div>
  );
}

// =========================================================================

function ExerciseCard({
  entry,
  onSave,
  onAddSet,
  onDeleteSet,
  onRemove,
}: {
  entry: SessionExercise & { sets: DraftSet[] };
  onSave: SaveSet;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
}) {
  const [showCues, setShowCues] = useState(false);
  const timeBased = isTimeBased(entry.exercise);
  const rest = entry.target?.restSeconds ?? entry.exercise.default_rest_seconds;
  const labels = numberWorkingSets(entry.sets);

  return (
    <section className="surface-panel overflow-hidden">
      <header className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/entreno/ejercicios/${entry.exercise.id}`}
            className="truncate text-base font-semibold text-[var(--text-primary)]"
          >
            {entry.exercise.name}
          </Link>
          <p className="text-xs text-[var(--text-tertiary)]">
            {entry.target
              ? `${entry.target.sets} × ${entry.target.repsMin}-${entry.target.repsMax}` +
                (entry.target.rir != null ? ` · RIR ${entry.target.rir}` : "") +
                ` · ${rest}s`
              : `${entry.exercise.default_reps_min}-${entry.exercise.default_reps_max} reps · ${rest}s`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {entry.exercise.cues ? (
            <button
              type="button"
              onClick={() => setShowCues((v) => !v)}
              aria-expanded={showCues}
              className="btn-pill px-2.5 py-1 text-[11px]"
            >
              Técnica
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Quitar ${entry.exercise.name} de este entreno?`)) onRemove();
            }}
            aria-label={`Quitar ${entry.exercise.name}`}
            className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)]"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </header>

      {showCues && entry.exercise.cues ? (
        <p className="mx-4 mb-3 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]" style={{ background: "var(--surface-2)" }}>
          {entry.exercise.cues}
        </p>
      ) : null}

      {entry.target?.notes ? (
        <p className="mx-4 mb-3 text-xs italic text-[var(--text-secondary)]">
          {entry.target.notes}
        </p>
      ) : null}

      <div
        className="grid items-center gap-2 px-4 py-2"
        style={{ gridTemplateColumns: "2.2rem 1fr 1fr 1fr 2.4rem" }}
      >
        <span className="text-section">Serie</span>
        <span className="text-section">Previa</span>
        <span className="text-section">{timeBased ? "Seg" : "Kg"}</span>
        <span className="text-section">{timeBased ? "—" : "Repes"}</span>
        <span />
      </div>

      {entry.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          label={labels.get(set.id) ?? "?"}
          previous={entry.previous.get(set.set_number) ?? null}
          timeBased={timeBased}
          targetRepsMin={entry.target?.repsMin ?? entry.exercise.default_reps_min}
          restSeconds={rest}
          exerciseName={entry.exercise.name}
          onSave={onSave}
          onDelete={() => onDeleteSet(set.id)}
        />
      ))}

      <button
        type="button"
        onClick={onAddSet}
        className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--border-soft)] py-3 text-xs font-semibold text-[var(--text-secondary)]"
      >
        <PlusIcon size={13} /> Añadir serie
      </button>
    </section>
  );
}

// =========================================================================

function SetRow({
  set,
  label,
  previous,
  timeBased,
  targetRepsMin,
  restSeconds,
  exerciseName,
  onSave,
  onDelete,
}: {
  set: DraftSet;
  /** Lo que se pinta en la columna SERIE: "1", "2", "C" o "D". */
  label: string;
  previous: { weightKg: number | null; reps: number | null } | null;
  timeBased: boolean;
  targetRepsMin: number;
  restSeconds: number;
  exerciseName: string;
  onSave: SaveSet;
  onDelete: () => void;
}) {
  // Coma decimal, no punto: 72,5 es como se escriben los kilos aquí. Al
  // guardar se vuelve a convertir, así que el teclado numérico del iPhone
  // (que ofrece coma) y el de escritorio (que ofrece punto) valen los dos.
  const [weight, setWeight] = useState(set.weight_kg != null ? decimalEs(set.weight_kg) : "");
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : "");
  const [duration, setDuration] = useState(
    set.duration_seconds != null ? String(set.duration_seconds) : "",
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const done = Boolean(set.completed_at);
  const isWarmup = set.set_type === "calentamiento";

  /**
   * Al marcar una serie sin haber escrito nada, hereda lo de la previa.
   *
   * Es el caso más común del gimnasio: repites lo del otro día. Obligar a
   * teclear el mismo número que ya está a la izquierda, en gris, es
   * trabajo que la app puede hacer sola.
   */
  function resolveValues() {
    const w = weight.trim() === "" ? previous?.weightKg ?? null : Number(weight.replace(",", "."));
    const r = reps.trim() === "" ? previous?.reps ?? targetRepsMin : Number(reps);
    const d = duration.trim() === "" ? null : Number(duration);
    return { w: Number.isFinite(w as number) ? (w as number) : null, r, d };
  }

  function toggleDone() {
    if (done) {
      onSave(set, {}, false);
      return;
    }
    const { w, r, d } = resolveValues();
    if (timeBased) {
      if (d == null || d <= 0) {
        setDetailOpen(true);
        return;
      }
      onSave(set, { durationSeconds: d, weightKg: w }, true, restSeconds, exerciseName);
      return;
    }
    onSave(set, { weightKg: w, reps: r }, true, restSeconds, exerciseName);
    // Rellena la fila con lo que se ha guardado de verdad, para que
    // heredar la previa se vea en pantalla y no quede el hueco vacío.
    setWeight(w != null ? decimalEs(w) : "");
    setReps(String(r));
  }

  const cellClass =
    "text-metric w-full rounded-lg bg-transparent px-2 py-2 text-center text-base text-[var(--text-primary)] outline-none focus:bg-[var(--surface-2)]";

  return (
    <>
      <div
        className="grid items-center gap-2 border-t border-[var(--border-soft)] px-4 py-1.5"
        style={{
          gridTemplateColumns: "2.2rem 1fr 1fr 1fr 2.4rem",
          background: done ? "var(--accent-soft)" : undefined,
          transition: "background-color 180ms ease",
        }}
      >
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={`Opciones de la serie ${label}`}
          className="text-metric text-left text-sm"
          style={{ color: isWarmup ? "var(--text-tertiary)" : "var(--text-primary)" }}
        >
          {label}
        </button>

        <span className="text-metric truncate text-center text-[13px] text-[var(--text-tertiary)]">
          {previous
            ? timeBased
              ? "—"
              : `${previous.weightKg != null ? formatKg(previous.weightKg) : "–"} × ${previous.reps ?? "–"}`
            : "—"}
        </span>

        {timeBased ? (
          <>
            <input
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() =>
                done && onSave(set, { durationSeconds: duration ? Number(duration) : null }, true)
              }
              placeholder="–"
              aria-label="Segundos"
              className={cellClass}
            />
            <span className="text-center text-xs text-[var(--text-tertiary)]">—</span>
          </>
        ) : (
          <>
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))}
              onBlur={() =>
                done &&
                onSave(set, { weightKg: weight ? Number(weight.replace(",", ".")) : null }, true)
              }
              placeholder={previous?.weightKg != null ? formatKg(previous.weightKg) : "–"}
              aria-label="Kilos"
              className={cellClass}
            />
            <input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => done && onSave(set, { reps: reps ? Number(reps) : null }, true)}
              placeholder={previous?.reps != null ? String(previous.reps) : String(targetRepsMin)}
              aria-label="Repeticiones"
              className={cellClass}
            />
          </>
        )}

        <button
          type="button"
          onClick={toggleDone}
          aria-label={done ? `Desmarcar la serie ${label}` : `Marcar la serie ${label} como hecha`}
          aria-pressed={done}
          className="tap-scale flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background: done ? "var(--accent)" : "var(--surface-2)",
            color: done ? "var(--accent-fg)" : "var(--text-tertiary)",
            opacity: set.saving ? 0.55 : 1,
            transition: "background-color 180ms ease, opacity 120ms ease",
          }}
        >
          <CheckIcon size={17} />
        </button>
      </div>

      {set.notes ? (
        <p className="px-4 pb-2 text-[11px] italic text-[var(--text-secondary)]">{set.notes}</p>
      ) : null}

      <SetDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        set={set}
        label={label}
        timeBased={timeBased}
        onSave={(patch) => {
          onSave(set, patch, done);
          setDetailOpen(false);
        }}
        onDelete={() => {
          setDetailOpen(false);
          onDelete();
        }}
      />
    </>
  );
}

// =========================================================================

const SET_TYPES: SetType[] = ["calentamiento", "normal", "backoff", "fallo", "dropset"];

function SetDetailSheet({
  open,
  onOpenChange,
  set,
  label,
  timeBased,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  set: DraftSet;
  label: string;
  timeBased: boolean;
  onSave: (patch: {
    setType?: SetType;
    rir?: number | null;
    notes?: string | null;
    durationSeconds?: number | null;
  }) => void;
  onDelete: () => void;
}) {
  const [setType, setSetType] = useState<SetType>(set.set_type as SetType);
  const [rir, setRir] = useState(set.rir != null ? String(set.rir) : "");
  const [notes, setNotes] = useState(set.notes ?? "");
  const [duration, setDuration] = useState(
    set.duration_seconds != null ? String(set.duration_seconds) : "",
  );

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`Serie ${label}`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-section">Tipo de serie</span>
          <div className="flex flex-wrap gap-1.5">
            {SET_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSetType(t)}
                data-active={setType === t ? "true" : undefined}
                className="btn-pill px-3 py-1.5 text-xs"
              >
                {SET_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {setType === "calentamiento"
              ? "No cuenta para el volumen semanal ni puede ser récord: es una aproximación, no trabajo efectivo."
              : setType === "dropset"
                ? "Cuenta para el volumen, pero no opta a récord de peso: se hace con la fatiga de la serie anterior, así que no es comparable con una serie fresca."
                : "Cuenta entera para el volumen semanal y puede batir récord."}
          </p>
        </div>

        {timeBased ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-section">Segundos</span>
            <input
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
              className="input-field"
              placeholder="45"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-section">RIR — repeticiones en recámara</span>
          <input
            inputMode="decimal"
            value={rir}
            onChange={(e) => setRir(e.target.value.replace(/[^0-9.,]/g, ""))}
            className="input-field"
            placeholder="2"
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Cuántas repeticiones más habrías podido hacer. 0 es fallo total. Es la forma de
            apuntar la intensidad sin saber tu máximo.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-section">Nota de esta serie</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="input-field resize-none"
            placeholder="La última repetición se fue hacia delante…"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                setType,
                rir: rir.trim() === "" ? null : Number(rir.replace(",", ".")),
                notes: notes.trim() === "" ? null : notes.trim(),
                ...(timeBased
                  ? { durationSeconds: duration.trim() === "" ? null : Number(duration) }
                  : {}),
              })
            }
            className="btn-primary tap-scale flex-1 rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Borrar esta serie"
            className="btn-danger tap-scale flex h-12 w-12 items-center justify-center rounded-xl"
          >
            <TrashIcon size={17} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// =========================================================================

function RecordsSheet({
  records,
  onClose,
}: {
  records: NewRecord[] | null;
  onClose: () => void;
}) {
  if (!records || records.length === 0) return null;
  return (
    <Sheet open onOpenChange={onClose} title="¡Récord!">
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
          >
            <TrophyIcon size={30} />
          </span>
        </div>
        {records.map((r, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">{r.message}</p>
            {r.previous ? (
              <p className="text-xs text-[var(--text-secondary)]">
                Tu marca anterior era {r.previous}
              </p>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
        >
          Seguir
        </button>
      </div>
    </Sheet>
  );
}

// =========================================================================

function FinishSheet({
  open,
  onOpenChange,
  completedCount,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  completedCount: number;
  onFinish: (effort: number | null, notes: string | null) => void;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Terminar entreno">
      <div className="flex flex-col gap-5">
        {completedCount === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No has completado ninguna serie, así que el entreno se descartará en vez de
            guardarse vacío.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            {completedCount} series completadas. Las series que dejaste sin marcar no se
            guardan: si no se hicieron, no deberían salir en el historial.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-section">¿Cómo de duro ha sido? (opcional)</span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEffort(effort === n ? null : n)}
                data-active={effort === n ? "true" : undefined}
                className="btn-pill h-9 w-9 justify-center px-0 text-xs"
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            1 es un paseo, 10 es no poder con otra serie. Sirve para ver si una racha de
            entrenos muy duros explica un estancamiento.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-section">Notas del entreno (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="input-field resize-none"
            placeholder="Dormí poco, el gimnasio estaba a tope…"
          />
        </label>

        <button
          type="button"
          onClick={() => onFinish(effort, notes.trim() || null)}
          className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
        >
          {completedCount === 0 ? "Descartar y salir" : "Guardar entreno"}
        </button>
      </div>
    </Sheet>
  );
}

/** 72,5 en vez de 72.5; 70 en vez de 70.0. Para EDITAR, no para mostrar. */
function decimalEs(n: number): string {
  return String(n).replace(".", ",");
}
