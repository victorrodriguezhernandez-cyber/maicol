"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addRoutineDay,
  deleteRoutineDay,
  addRoutineExercise,
  updateRoutineExercise,
  deleteRoutineExercise,
  reorderRoutineExercises,
  updateRoutineMeta,
  archiveRoutine,
  unarchiveRoutine,
  deleteRoutine,
  duplicateRoutine,
} from "@/lib/actions/training";
import type { RoutineWithDays } from "@/lib/data/training";
import { GOAL_LABELS, medicionDe, rangoDeMedicion, type RoutineGoal } from "@/lib/training/types";
import { MUSCLE_LABELS } from "@/lib/training/muscles";
import { ExercisePicker } from "./ExercisePicker";
import { Sheet } from "@/components/ui/Sheet";
import { RoutineActiveToggle } from "./RoutineActiveToggle";
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  CopyIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

/**
 * El editor de una rutina.
 *
 * Cada cambio se guarda en cuanto se hace, sin un botón de "guardar": una
 * rutina se toca poco a poco a lo largo de semanas, y un formulario que
 * hay que confirmar entero acaba con cambios perdidos por salir de la
 * pantalla. A cambio, cada acción refresca desde el servidor — aquí no
 * hay prisa como en el registro de series, y ser exacto vale más que ser
 * instantáneo.
 */
export function RoutineEditor({ routine }: { routine: RoutineWithDays }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    RoutineWithDays["routine_days"][number]["routine_exercises"][number] | null
  >(null);
  const [metaOpen, setMetaOpen] = useState(false);

  function run(fn: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : message);
      }
    });
  }

  const archived = Boolean(routine.archived_at);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-meta">{GOAL_LABELS[routine.goal]}</p>
          <h1 className="text-hero-title truncate text-[1.6rem] text-[var(--text-primary)]">
            {routine.name}
          </h1>
          {routine.notes ? (
            <p className="text-xs text-[var(--text-secondary)]">{routine.notes}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setMetaOpen(true)}
          aria-label="Editar nombre y objetivo"
          className="btn-pill shrink-0 px-3 py-1.5 text-xs"
        >
          <EditIcon size={13} />
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

      {archived ? (
        <div className="surface-soft flex flex-col gap-2 p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Esta rutina está archivada. Tus entrenos pasados con ella siguen intactos.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unarchiveRoutine(routine.id), "No se ha podido recuperar.")}
            className="btn-secondary tap-scale rounded-xl py-2.5 text-sm font-semibold text-[var(--text-primary)]"
          >
            Recuperar rutina
          </button>
        </div>
      ) : (
        <RoutineActiveToggle routineId={routine.id} isActive={routine.is_active} />
      )}

      {routine.routine_days.map((day) => (
        <section key={day.id} className="surface-panel overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-[var(--text-primary)]">
                {day.name}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {day.routine_exercises.length} ejercicio
                {day.routine_exercises.length === 1 ? "" : "s"} ·{" "}
                {day.routine_exercises.reduce((n, e) => n + e.target_sets, 0)} series
              </span>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Borrar el día "${day.name}" y sus ejercicios?`)) return;
                run(() => deleteRoutineDay(day.id), "No se ha podido borrar el día.");
              }}
              aria-label={`Borrar el día ${day.name}`}
              className="tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)]"
            >
              <TrashIcon size={15} />
            </button>
          </header>

          {day.routine_exercises.map((re, index) => (
            <div
              key={re.id}
              className="flex items-center gap-2 border-t border-[var(--border-soft)] px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {re.superset_group ? `${re.superset_group} · ` : ""}
                  {re.exercises.name}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {/* El rango se pregunta al ejercicio: una plancha se
                      pauta en segundos, no en "1-1 reps". */}
                  {(() => {
                    const r = objetivoDeFila(re);
                    return `${re.target_sets} × ${r.min}-${r.max}${r.unidad === "s" ? " s" : ""}`;
                  })()}
                  {re.target_rir != null ? ` · RIR ${re.target_rir}` : ""} · {re.rest_seconds}s ·{" "}
                  {MUSCLE_LABELS[re.exercises.primary_muscle]}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={pending || index === 0}
                  onClick={() => {
                    const ids = day.routine_exercises.map((x) => x.id);
                    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                    run(
                      () => reorderRoutineExercises(day.id, ids),
                      "No se ha podido reordenar.",
                    );
                  }}
                  aria-label="Subir"
                  className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)] disabled:opacity-30"
                >
                  <ChevronDownIcon size={14} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button
                  type="button"
                  disabled={pending || index === day.routine_exercises.length - 1}
                  onClick={() => {
                    const ids = day.routine_exercises.map((x) => x.id);
                    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
                    run(
                      () => reorderRoutineExercises(day.id, ids),
                      "No se ha podido reordenar.",
                    );
                  }}
                  aria-label="Bajar"
                  className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-tertiary)] disabled:opacity-30"
                >
                  <ChevronDownIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(re)}
                  aria-label={`Ajustar ${re.exercises.name}`}
                  className="tap-scale flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)]"
                >
                  <EditIcon size={14} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={pending}
            onClick={() => setPickerFor(day.id)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-[var(--border-soft)] py-3 text-xs font-semibold text-[var(--text-secondary)]"
          >
            <PlusIcon size={13} /> Añadir ejercicio a {day.name}
          </button>
        </section>
      ))}

      <button
        type="button"
        disabled={pending || routine.routine_days.length >= 14}
        onClick={() => {
          const name = prompt("¿Cómo se llama el día?", `Día ${routine.routine_days.length + 1}`);
          if (!name?.trim()) return;
          run(() => addRoutineDay(routine.id, name.trim()), "No se ha podido añadir el día.");
        }}
        className="btn-secondary tap-scale flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]"
      >
        <PlusIcon size={16} /> Añadir día
      </button>

      <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const id = await duplicateRoutine(routine.id);
                router.push(`/entreno/rutinas/${id}`);
                router.refresh();
              } catch {
                setError("No se ha podido duplicar la rutina.");
              }
            })
          }
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]"
        >
          <CopyIcon size={13} /> Duplicar rutina
        </button>

        {!archived ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => archiveRoutine(routine.id), "No se ha podido archivar.")
            }
            className="text-xs font-medium text-[var(--text-tertiary)]"
          >
            Archivar rutina
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                "¿Borrar esta rutina? Los entrenos que ya hiciste con ella se conservan, sólo dejan de apuntar a un plan.",
              )
            )
              return;
            startTransition(async () => {
              try {
                await deleteRoutine(routine.id);
                router.push("/entreno/rutinas");
                router.refresh();
              } catch {
                setError("No se ha podido borrar la rutina.");
              }
            });
          }}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]"
        >
          <TrashIcon size={13} /> Borrar rutina
        </button>

        <Link
          href="/entreno"
          className="pt-2 text-center text-xs font-semibold"
          style={{ color: "var(--accent-2)" }}
        >
          Volver a Entreno
        </Link>
      </div>

      <ExercisePicker
        open={pickerFor !== null}
        onOpenChange={(v) => !v && setPickerFor(null)}
        onPick={(exerciseId, exercise) => {
          const dayId = pickerFor;
          setPickerFor(null);
          if (!dayId) return;
          run(
            () =>
              addRoutineExercise({
                routineDayId: dayId,
                exerciseId,
                targetSets: 3,
                targetRepsMin: exercise.default_reps_min,
                targetRepsMax: exercise.default_reps_max,
                // Si el ejercicio se mide por tiempo, la rutina arranca
                // con SU rango en segundos en vez de con un 1-1 vacío.
                targetDurationMin: exercise.tracks_duration
                  ? exercise.default_duration_min
                  : null,
                targetDurationMax: exercise.tracks_duration
                  ? exercise.default_duration_max
                  : null,
                restSeconds: exercise.default_rest_seconds,
              }),
            "No se ha podido añadir el ejercicio.",
          );
        }}
      />

      {editing ? (
        <TargetSheet
          key={editing.id}
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            const id = editing.id;
            setEditing(null);
            run(
              () =>
                updateRoutineExercise(id, {
                  exerciseId: editing.exercise_id,
                  ...patch,
                }),
              "No se han podido guardar los objetivos.",
            );
          }}
          onDelete={() => {
            const id = editing.id;
            setEditing(null);
            run(() => deleteRoutineExercise(id), "No se ha podido quitar el ejercicio.");
          }}
        />
      ) : null}

      {metaOpen ? (
        <MetaSheet
          routine={routine}
          onClose={() => setMetaOpen(false)}
          onSave={(patch) => {
            setMetaOpen(false);
            run(
              () => updateRoutineMeta(routine.id, patch),
              "No se han podido guardar los cambios.",
            );
          }}
        />
      ) : null}
    </div>
  );
}

// =========================================================================

/** El rango pautado de una fila de rutina, en su unidad de verdad. */
function objetivoDeFila(
  re: RoutineWithDays["routine_days"][number]["routine_exercises"][number],
) {
  return rangoDeMedicion(re.exercises, {
    repsMin: re.target_reps_min,
    repsMax: re.target_reps_max,
    durationMin: re.target_duration_min,
    durationMax: re.target_duration_max,
  });
}

function TargetSheet({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: RoutineWithDays["routine_days"][number]["routine_exercises"][number];
  onClose: () => void;
  onSave: (patch: {
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    targetDurationMin: number | null;
    targetDurationMax: number | null;
    targetRir: number | null;
    restSeconds: number;
    notes: string | null;
    supersetGroup: string | null;
  }) => void;
  onDelete: () => void;
}) {
  // Qué se pauta lo decide el ejercicio, no el editor: pedir "reps mín."
  // y "reps máx." en una plancha es pedir un número que no existe.
  const medicion = medicionDe(entry.exercises);
  const porTiempo = medicion.tiempo && !medicion.reps;
  const rango = objetivoDeFila(entry);

  const [sets, setSets] = useState(String(entry.target_sets));
  const [repsMin, setRepsMin] = useState(String(rango.min));
  const [repsMax, setRepsMax] = useState(String(rango.max));
  const [rir, setRir] = useState(entry.target_rir != null ? String(entry.target_rir) : "");
  const [rest, setRest] = useState(String(entry.rest_seconds));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [superset, setSuperset] = useState(entry.superset_group ?? "");

  return (
    <Sheet open onOpenChange={onClose} title={entry.exercises.name}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Series" value={sets} onChange={setSets} />
          <NumberField
            label={porTiempo ? "Seg. mín." : "Reps mín."}
            value={repsMin}
            onChange={setRepsMin}
          />
          <NumberField
            label={porTiempo ? "Seg. máx." : "Reps máx."}
            value={repsMax}
            onChange={setRepsMax}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Descanso (s)" value={rest} onChange={setRest} />
          {/* El RIR se cuenta en repeticiones que te sobran, así que en un
              ejercicio de puro tiempo no significa nada. */}
          {porTiempo ? null : (
            <label className="flex flex-col gap-1.5">
              <span className="text-section">RIR objetivo</span>
              <input
                inputMode="decimal"
                value={rir}
                onChange={(e) => setRir(e.target.value.replace(/[^0-9.,]/g, ""))}
                className="input-field text-center"
                placeholder="—"
              />
            </label>
          )}
        </div>
        <p className="-mt-2 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          {porTiempo
            ? "Este ejercicio se mide en segundos, así que los dos números de arriba son el aguante que buscas por serie."
            : "RIR es cuántas repeticiones deberían sobrarte al acabar la serie. Déjalo vacío si prefieres no pautarlo."}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-section">Superserie</span>
          <input
            value={superset}
            onChange={(e) => setSuperset(e.target.value.toUpperCase().slice(0, 1))}
            maxLength={1}
            className="input-field"
            placeholder="A"
          />
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Una letra. Los ejercicios del día con la misma letra se hacen encadenados, sin
            descanso entre ellos.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-section">Nota</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="input-field resize-none"
            placeholder="Banco al 30°, agarre ancho…"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                targetSets: Number(sets) || 3,
                // En un ejercicio de tiempo, los dos campos son segundos
                // y las repeticiones se quedan en 1-1: son columnas NOT
                // NULL que no se enseñan nunca (migración 0022).
                targetRepsMin: porTiempo ? 1 : Number(repsMin) || 8,
                targetRepsMax: porTiempo ? 1 : Number(repsMax) || 12,
                targetDurationMin: porTiempo ? Number(repsMin) || 30 : null,
                targetDurationMax: porTiempo ? Number(repsMax) || 60 : null,
                targetRir: porTiempo || rir.trim() === "" ? null : Number(rir.replace(",", ".")),
                restSeconds: Number(rest) || 90,
                notes: notes.trim() || null,
                supersetGroup: /^[A-Z]$/.test(superset) ? superset : null,
              })
            }
            className="btn-primary tap-scale flex-1 rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Quitar de la rutina"
            className="btn-danger tap-scale flex h-12 w-12 items-center justify-center rounded-xl"
          >
            <TrashIcon size={17} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function MetaSheet({
  routine,
  onClose,
  onSave,
}: {
  routine: RoutineWithDays;
  onClose: () => void;
  onSave: (patch: { name: string; goal: RoutineGoal; notes: string | null }) => void;
}) {
  const [name, setName] = useState(routine.name);
  const [goal, setGoal] = useState<RoutineGoal>(routine.goal);
  const [notes, setNotes] = useState(routine.notes ?? "");

  return (
    <Sheet open onOpenChange={onClose} title="Ajustes de la rutina">
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-section">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="input-field"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-section">Objetivo</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(GOAL_LABELS) as RoutineGoal[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                data-active={goal === g ? "true" : undefined}
                className="btn-pill px-3 py-1.5 text-xs"
              >
                {GOAL_LABELS[g]}
              </button>
            ))}
          </div>
          <span className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            Cambia los rangos de repeticiones y descansos que se proponen al añadir
            ejercicios, y es lo que usa la IA si le pides que la ajuste.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-section">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="input-field resize-none"
          />
        </label>

        <button
          type="button"
          disabled={name.trim() === ""}
          onClick={() => onSave({ name: name.trim(), goal, notes: notes.trim() || null })}
          className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-section">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="input-field text-center"
      />
    </label>
  );
}
