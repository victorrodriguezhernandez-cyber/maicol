"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  type ExerciseInput,
} from "@/lib/actions/training";
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type MuscleGroup,
} from "@/lib/training/muscles";
import {
  EQUIPMENT_LABELS,
  PATTERN_LABELS,
  type ExerciseRow,
  type Equipment,
  type Mechanic,
  type MovementPattern,
} from "@/lib/training/types";
import { TrashIcon } from "@/components/ui/icons";

/**
 * Crear o editar un ejercicio propio.
 *
 * Pide más de lo que parece necesario (patrón de movimiento, músculos
 * secundarios) porque son los campos de los que dependen dos cosas que el
 * usuario sí ve: el volumen semanal por músculo y la capacidad de la IA
 * de montar una rutina equilibrada. Un ejercicio sin patrón sería un
 * ejercicio que el generador de rutinas no sabe dónde colocar, y cada
 * campo lleva escrito para qué sirve en vez de dejarlo adivinar.
 */
export function ExerciseForm({ exercise }: { exercise?: ExerciseRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(exercise?.name ?? "");
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>(
    exercise?.primary_muscle ?? "pecho",
  );
  const [secondary, setSecondary] = useState<MuscleGroup[]>(
    exercise?.secondary_muscles ?? [],
  );
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? "mancuernas");
  const [mechanic, setMechanic] = useState<Mechanic>(exercise?.mechanic ?? "compuesto");
  const [pattern, setPattern] = useState<MovementPattern>(
    exercise?.pattern ?? "empuje_horizontal",
  );
  const [unilateral, setUnilateral] = useState(exercise?.is_unilateral ?? false);
  const [repsMin, setRepsMin] = useState(String(exercise?.default_reps_min ?? 8));
  const [repsMax, setRepsMax] = useState(String(exercise?.default_reps_max ?? 12));
  const [rest, setRest] = useState(String(exercise?.default_rest_seconds ?? 90));
  const [cues, setCues] = useState(exercise?.cues ?? "");

  function submit() {
    setError(null);
    const input: ExerciseInput = {
      name,
      primaryMuscle,
      secondaryMuscles: secondary,
      equipment,
      mechanic,
      pattern,
      isUnilateral: unilateral,
      defaultRepsMin: Number(repsMin),
      defaultRepsMax: Number(repsMax),
      defaultRestSeconds: Number(rest),
      cues: cues.trim() || null,
    };

    startTransition(async () => {
      try {
        if (exercise) {
          await updateCustomExercise(exercise.id, input);
          router.push(`/entreno/ejercicios/${exercise.id}`);
        } else {
          const id = await createCustomExercise(input);
          router.push(`/entreno/ejercicios/${id}`);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar el ejercicio.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      {error ? (
        <p
          role="alert"
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-section">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="input-field"
          placeholder="Press inclinado en máquina Hammer"
        />
      </label>

      <Field
        label="Músculo principal"
        help="El que estás intentando entrenar. Cada serie cuenta entera para este músculo en el volumen semanal."
      >
        <Chips
          options={MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_LABELS[m] }))}
          value={primaryMuscle}
          onChange={(m) => {
            setPrimaryMuscle(m);
            setSecondary((s) => s.filter((x) => x !== m));
          }}
        />
      </Field>

      <Field
        label="Músculos secundarios"
        help="Los que trabajan de verdad pero no son el objetivo. Cada uno suma media serie al volumen semanal, así que marcar de más hace que la app te diga que vas sobrado cuando no lo vas."
      >
        <Chips
          multiple
          options={MUSCLE_GROUPS.filter((m) => m !== primaryMuscle).map((m) => ({
            value: m,
            label: MUSCLE_LABELS[m],
          }))}
          values={secondary}
          onToggle={(m) =>
            setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m].slice(0, 6)))
          }
        />
      </Field>

      <Field label="Material">
        <Chips
          options={(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => ({
            value: e,
            label: EQUIPMENT_LABELS[e],
          }))}
          value={equipment}
          onChange={setEquipment}
        />
      </Field>

      <Field
        label="Tipo"
        help="Compuesto es el que cruza más de una articulación (sentadilla, press). Aislamiento mueve una sola (curl, extensión). Decide el descanso que se propone y el orden dentro de la sesión."
      >
        <Chips
          options={[
            { value: "compuesto" as const, label: "Compuesto" },
            { value: "aislamiento" as const, label: "Aislamiento" },
          ]}
          value={mechanic}
          onChange={setMechanic}
        />
      </Field>

      <Field
        label="Patrón de movimiento"
        help="Es lo que permite montar una rutina equilibrada — un empuje por cada tirón. Sin esto, el generador de rutinas no sabe dónde encaja el ejercicio."
      >
        <Chips
          options={(Object.keys(PATTERN_LABELS) as MovementPattern[]).map((p) => ({
            value: p,
            label: PATTERN_LABELS[p],
          }))}
          value={pattern}
          onChange={setPattern}
        />
      </Field>

      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--text-primary)]">Unilateral</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Se hace un lado cada vez (zancadas, remo a una mano).
          </span>
        </span>
        <input
          type="checkbox"
          checked={unilateral}
          onChange={(e) => setUnilateral(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--accent)]"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-section">Reps mín.</span>
          <input
            inputMode="numeric"
            value={repsMin}
            onChange={(e) => setRepsMin(e.target.value.replace(/[^0-9]/g, ""))}
            className="input-field text-center"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-section">Reps máx.</span>
          <input
            inputMode="numeric"
            value={repsMax}
            onChange={(e) => setRepsMax(e.target.value.replace(/[^0-9]/g, ""))}
            className="input-field text-center"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-section">Descanso (s)</span>
          <input
            inputMode="numeric"
            value={rest}
            onChange={(e) => setRest(e.target.value.replace(/[^0-9]/g, ""))}
            className="input-field text-center"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-section">Cómo se hace</span>
        <textarea
          value={cues}
          onChange={(e) => setCues(e.target.value)}
          rows={4}
          maxLength={1000}
          className="input-field resize-none"
          placeholder="Lo que te recuerdas a ti mismo cada vez que lo haces…"
        />
        <span className="text-[11px] text-[var(--text-tertiary)]">
          Opcional, pero es lo que se te enseña durante el entreno al tocar «Técnica».
        </span>
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={pending || name.trim() === ""}
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {pending ? "Guardando…" : exercise ? "Guardar cambios" : "Crear ejercicio"}
      </button>

      {exercise ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`¿Borrar "${exercise.name}"?`)) return;
            startTransition(async () => {
              try {
                const result = await deleteCustomExercise(exercise.id);
                if (result.archived) {
                  alert(
                    "Como ya lo has usado en algún entreno, el ejercicio se ha ocultado del catálogo en vez de borrarse: así tu historial sigue completo.",
                  );
                }
                router.push("/entreno/ejercicios");
                router.refresh();
              } catch {
                setError("No se ha podido borrar el ejercicio.");
              }
            });
          }}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]"
        >
          <TrashIcon size={13} /> Borrar ejercicio
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-section">{label}</span>
      {children}
      {help ? (
        <span className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">{help}</span>
      ) : null}
    </div>
  );
}

function Chips<T extends string>(
  props:
    | { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; multiple?: false }
    | {
        options: { value: T; label: string }[];
        values: T[];
        onToggle: (v: T) => void;
        multiple: true;
      },
) {
  return (
    <div className="-mx-4 flex flex-wrap gap-1.5 px-4">
      {props.options.map((opt) => {
        const active = props.multiple
          ? props.values.includes(opt.value)
          : props.value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => (props.multiple ? props.onToggle(opt.value) : props.onChange(opt.value))}
            data-active={active ? "true" : undefined}
            className="btn-pill px-3 py-1.5 text-xs"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
