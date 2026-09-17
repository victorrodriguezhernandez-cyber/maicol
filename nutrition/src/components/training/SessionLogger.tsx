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
import {
  medicionDe,
  rangoDeMedicion,
  SET_TYPE_LABELS,
  numberWorkingSets,
  type Medicion,
} from "@/lib/training/types";
import type { PreviousSet, Recomendacion } from "@/lib/training/progression";
import type { Prescripcion } from "@/lib/training/prescripcion";
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
  const medicion = medicionDe(entry.exercise);
  // Un ejercicio que sólo se mide por tiempo no tiene rango de
  // repeticiones que pautar, así que tampoco tiene recomendación: el motor
  // todavía sólo decide sobre repeticiones y fingir lo contrario sería
  // inventarse un consejo (regla 11).
  const soloTiempo = medicion.tiempo && !medicion.reps;
  const rangoMedido = rangoDeMedicion(entry.exercise);
  const rest = entry.target?.restSeconds ?? entry.exercise.default_rest_seconds;
  const labels = numberWorkingSets(entry.sets);
  // El rango con el que se ha juzgado de verdad la sesión: el de tu
  // rutina, o el corregido por objetivo cuando aquél se alejaba.
  const rango =
    entry.fuenteDelRango === "rutina" && entry.target ? entry.target : entry.prescripcion;

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
            {soloTiempo
              ? `${entry.target?.sets ?? entry.prescripcion.sets} × ${rangoMedido.min}-${rangoMedido.max} s · descanso ${rest}s`
              : `${entry.target?.sets ?? entry.prescripcion.sets} × ${rango.repsMin}-${rango.repsMax}` +
                ` · RIR ${entry.target?.rir ?? entry.prescripcion.rir}` +
                ` · ${rest}s`}
            {!soloTiempo && entry.fuenteDelRango === "objetivo" && entry.target ? (
              <span className="ml-1.5 text-[var(--accent)]">ajustado</span>
            ) : null}
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
              // "de este entreno" ya lo decía, pero se puede leer como "lo
              // borro de la rutina". Quitar un ejercicio de la rutina para
              // siempre se hace en el editor de rutinas, no aquí, y
              // confundir las dos cosas te cambia el plan sin querer.
              const aviso =
                `¿Quitar ${entry.exercise.name} sólo de hoy?\n\n` +
                `Tu rutina no cambia: el próximo día vuelve a aparecer. ` +
                `Para quitarlo de todos los días, edita la rutina.`;
              if (confirm(aviso)) onRemove();
            }}
            aria-label={`Quitar ${entry.exercise.name} sólo de hoy`}
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

      {soloTiempo ? (
        <p className="mx-4 mb-3 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]" style={{ background: "var(--surface-2)" }}>
          Este ejercicio se mide por tiempo. Apunta los kilos y los segundos; el
          consejo automático de carga todavía sólo funciona con repeticiones, así
          que aquí no te digo un número que no podría justificar.
        </p>
      ) : (
        <PlanDeHoy
          recomendacion={entry.recomendacion}
          prescripcion={entry.prescripcion}
          rutinaCorregida={entry.fuenteDelRango === "objetivo" && entry.target != null}
        />
      )}

      <div
        className="grid items-center gap-2 px-4 py-2"
        style={{ gridTemplateColumns: plantillaDeColumnas(medicion) }}
      >
        <span className="text-section">Serie</span>
        <span className="text-section">Previa</span>
        {medicion.peso ? <span className="text-section">Kg</span> : null}
        {medicion.reps ? <span className="text-section">Repes</span> : null}
        {medicion.tiempo ? <span className="text-section">Seg</span> : null}
        <span />
      </div>

      {entry.sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          label={labels.get(set.id) ?? "?"}
          previous={entry.previous.get(set.set_number) ?? null}
          medicion={medicion}
          sugerido={entry.recomendacion}
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

/**
 * "Hoy toca X, y por esto."
 *
 * El título se lee de un vistazo mientras cargas la barra; el porqué está
 * a un toque y trae los números exactos de los que sale (regla 9: una
 * etiqueta que no se puede defender no debería existir). Se despliega en
 * vez de estar siempre abierto porque cuando ya sabes qué toca, cuatro
 * líneas de explicación por ejercicio te tapan la hoja de registro.
 */
function PlanDeHoy({
  recomendacion,
  prescripcion,
  rutinaCorregida,
}: {
  recomendacion: Recomendacion;
  prescripcion: Prescripcion;
  rutinaCorregida: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const { cambio, titulo, detalle } = recomendacion;

  // El porqué completo son dos cosas encadenadas: primero QUÉ RANGO toca
  // en este ejercicio, y sólo después qué peso sale de tu historial. En
  // ese orden, porque el peso se decide contra el rango.
  const porque = [
    ...(rutinaCorregida
      ? [
          `Tu rutina pedía otro rango, pero para este ejercicio y tu objetivo lo que toca son ${prescripcion.repsMin}-${prescripcion.repsMax} repeticiones. Puedes cambiarlo en la rutina si prefieres el tuyo.`,
        ]
      : []),
    ...prescripcion.porque,
    ...detalle,
  ];

  // Sólo "sube" se resalta: es la única que cambia lo que ibas a hacer.
  const acentuado = cambio === "sube";

  return (
    <div
      className="mx-4 mb-3 rounded-xl px-3 py-2.5"
      style={{
        background: "var(--surface-2)",
        borderLeft: `3px solid ${acentuado ? "var(--accent)" : "var(--border-soft)"}`,
      }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="min-w-0">
          <span className="text-section block">Hoy toca</span>
          <span
            className={`block text-[13.5px] font-semibold ${
              acentuado ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            }`}
          >
            {titulo}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-[var(--text-tertiary)]">
          {abierto ? "Ocultar" : "Por qué"}
        </span>
      </button>

      {abierto ? (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-[var(--border-soft)] pt-2">
          {porque.map((linea, i) => (
            <li key={i} className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
              {linea}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// =========================================================================

/**
 * La rejilla de una fila: número de serie, previa, una columna por cada
 * cosa que mida el ejercicio, y el check.
 *
 * Se calcula en vez de estar fija porque no todos los ejercicios miden lo
 * mismo: un press son kilos y repeticiones, una plancha sólo segundos, y
 * un paseo del granjero kilos Y segundos. Con la rejilla fija de antes, el
 * peso del paseo del granjero no tenía dónde ir y se perdía.
 */
function plantillaDeColumnas(m: Medicion): string {
  const medidas = [m.peso, m.reps, m.tiempo].filter(Boolean).length;
  return `2.2rem 1fr ${Array(medidas).fill("1fr").join(" ")} 2.4rem`;
}

/** Lo que hiciste la última vez en esta serie, escrito en su unidad. */
function textoPrevia(p: PreviousSet | null | undefined, m: Medicion): string {
  if (!p) return "—";
  const peso = m.peso && p.weightKg != null ? formatKg(p.weightKg) : null;
  const reps = m.reps && p.reps != null ? String(p.reps) : null;
  const seg = m.tiempo && p.durationSeconds != null ? `${p.durationSeconds}s` : null;
  const derecha = [reps, seg].filter(Boolean).join(" · ");
  if (!peso && !derecha) return "—";
  if (!peso) return derecha;
  if (!derecha) return peso;
  return `${peso} × ${derecha}`;
}

function SetRow({
  set,
  label,
  previous,
  medicion,
  sugerido,
  restSeconds,
  exerciseName,
  onSave,
  onDelete,
}: {
  set: DraftSet;
  /** Lo que se pinta en la columna SERIE: "1", "2", "C" o "D". */
  label: string;
  previous: PreviousSet | null;
  /** Qué columnas toca enseñar en este ejercicio. */
  medicion: Medicion;
  /** Lo que el motor recomienda hoy para este ejercicio. */
  sugerido: Recomendacion;
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
   * Con qué peso y repeticiones se rellena la serie si la marcas sin
   * haber escrito nada.
   *
   * Es lo RECOMENDADO, no lo de la previa: si el motor dice que hoy toca
   * subir a 16 kg, dejarlo en los 14 del otro día sería enseñarte un
   * consejo y guardarte lo contrario. El calentamiento se queda con la
   * previa, porque ahí no se progresa.
   *
   * Cuando no hay historial (`sin_datos`) no hay peso que heredar y el
   * campo se queda vacío: inventarlo sería simular un dato (regla 11).
   */
  const heredado = {
    weightKg: isWarmup
      ? previous?.weightKg ?? null
      : sugerido.weightKg ?? previous?.weightKg ?? null,
    reps: isWarmup ? previous?.reps ?? sugerido.reps : sugerido.reps,
    // El motor no decide sobre tiempo, así que aquí lo que se hereda es
    // lo que hiciste la otra vez. Es lo único defendible: repetir.
    durationSeconds: previous?.durationSeconds ?? null,
  };

  function resolveValues() {
    const w = weight.trim() === "" ? heredado.weightKg : Number(weight.replace(",", "."));
    const r = reps.trim() === "" ? heredado.reps : Number(reps);
    const d = duration.trim() === "" ? heredado.durationSeconds : Number(duration);
    return {
      w: Number.isFinite(w as number) ? (w as number) : null,
      r,
      d: Number.isFinite(d as number) ? (d as number) : null,
    };
  }

  function toggleDone() {
    if (done) {
      onSave(set, {}, false);
      return;
    }
    const { w, r, d } = resolveValues();

    // Sin el dato que define el ejercicio no se puede marcar hecha: se
    // abre la hoja de detalle en vez de guardar una serie vacía.
    if (medicion.tiempo && (d == null || d <= 0)) {
      setDetailOpen(true);
      return;
    }

    const patch: SetPatch = {};
    if (medicion.peso) patch.weightKg = w;
    if (medicion.reps) patch.reps = r;
    if (medicion.tiempo) patch.durationSeconds = d;

    onSave(set, patch, true, restSeconds, exerciseName);

    // Rellena la fila con lo que se ha guardado de verdad, para que
    // heredar la previa se vea en pantalla y no quede el hueco vacío.
    if (medicion.peso) setWeight(w != null ? decimalEs(w) : "");
    if (medicion.reps) setReps(String(r));
    if (medicion.tiempo) setDuration(d != null ? String(d) : "");
  }

  const cellClass =
    "text-metric w-full rounded-lg bg-transparent px-2 py-2 text-center text-base text-[var(--text-primary)] outline-none focus:bg-[var(--surface-2)]";

  return (
    <>
      <div
        className="grid items-center gap-2 border-t border-[var(--border-soft)] px-4 py-1.5"
        style={{
          gridTemplateColumns: plantillaDeColumnas(medicion),
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
          {textoPrevia(previous, medicion)}
        </span>

        {medicion.peso ? (
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))}
            onBlur={() =>
              done &&
              onSave(set, { weightKg: weight ? Number(weight.replace(",", ".")) : null }, true)
            }
            placeholder={heredado.weightKg != null ? formatKg(heredado.weightKg) : "–"}
            aria-label="Kilos"
            className={cellClass}
          />
        ) : null}

        {medicion.reps ? (
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() => done && onSave(set, { reps: reps ? Number(reps) : null }, true)}
            placeholder={String(heredado.reps)}
            aria-label="Repeticiones"
            className={cellClass}
          />
        ) : null}

        {medicion.tiempo ? (
          <input
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() =>
              done && onSave(set, { durationSeconds: duration ? Number(duration) : null }, true)
            }
            placeholder={heredado.durationSeconds != null ? String(heredado.durationSeconds) : "–"}
            aria-label="Segundos"
            className={cellClass}
          />
        ) : null}

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
        medicion={medicion}
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
  medicion,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  set: DraftSet;
  label: string;
  medicion: Medicion;
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

        {medicion.tiempo ? (
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
                ...(medicion.tiempo
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
