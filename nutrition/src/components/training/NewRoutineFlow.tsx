"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { invokeAi, mensajeDeFallo } from "@/lib/ai/invoke";
import { compressImageToBase64 } from "@/lib/image";
import { createRoutine, setActiveRoutine } from "@/lib/actions/training";
import { GOAL_LABELS, EQUIPMENT_LABELS, type RoutineGoal, type Equipment } from "@/lib/training/types";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { ROUTINE_TEMPLATES, type RoutineTemplate } from "@/lib/training/templates";
import {
  SparkleIcon,
  CameraIcon,
  EditIcon,
  BookIcon,
  AlertIcon,
  CheckIcon,
} from "@/components/ui/icons";

/**
 * Las cuatro formas de crear una rutina.
 *
 * Son cuatro y no una porque la pregunta "¿cómo entrenas?" tiene
 * respuestas muy distintas según la persona: uno ya tiene su rutina en un
 * papel, otro no sabe por dónde empezar, otro quiere montarla él. Obligar
 * a todos por el mismo embudo hace que tres de los cuatro se rindan.
 *
 * Las dos vías de IA acaban en lo mismo que las otras dos: una propuesta
 * que el usuario ve entera y acepta, y que se guarda llamando a
 * `createRoutine`, la misma acción validada que usa el editor manual. La
 * IA nunca escribe en la base de datos (regla 4 del proyecto).
 */

type Mode = "elegir" | "ia" | "foto" | "plantilla" | "manual";

interface ProposalExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRir: number | null;
  restSeconds: number;
  notes: string | null;
}

interface Proposal {
  name: string;
  goal: RoutineGoal;
  notes: string | null;
  rationale: string;
  source: "ia_chat" | "ia_foto";
  days: { name: string; notes: string | null; exercises: ProposalExercise[] }[];
  unmatched: string[];
  warnings: string[];
}

export function NewRoutineFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("elegir");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Guarda una propuesta (venga de la IA o de una plantilla). */
  function save(input: Parameters<typeof createRoutine>[0], activate: boolean) {
    startTransition(async () => {
      setError(null);
      try {
        const id = await createRoutine(input);
        if (activate) await setActiveRoutine(id);
        router.push(`/entreno/rutinas/${id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar la rutina.");
      }
    });
  }

  if (proposal) {
    return (
      <ProposalReview
        proposal={proposal}
        pending={pending}
        error={error}
        onBack={() => {
          setProposal(null);
          setError(null);
        }}
        onAccept={() =>
          save(
            {
              name: proposal.name,
              goal: proposal.goal,
              notes: proposal.notes,
              source: proposal.source,
              days: proposal.days.map((d) => ({
                name: d.name,
                notes: d.notes,
                exercises: d.exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  targetSets: e.targetSets,
                  targetRepsMin: e.targetRepsMin,
                  targetRepsMax: e.targetRepsMax,
                  targetRir: e.targetRir,
                  restSeconds: e.restSeconds,
                  notes: e.notes,
                })),
              })),
            },
            true,
          )
        }
      />
    );
  }

  if (mode === "elegir") {
    return (
      <div className="flex flex-col gap-3">
        <ModeCard
          icon={<SparkleIcon size={20} />}
          title="Cuéntaselo a la IA"
          description="Le dices cuántos días puedes, qué material tienes y qué buscas, y te monta la rutina con ejercicios reales del catálogo."
          onClick={() => setMode("ia")}
        />
        <ModeCard
          icon={<CameraIcon size={20} />}
          title="Foto de tu rutina"
          description="Una foto del papel, o una captura de otra app. La lee y la pasa a Maicol tal cual está, sin cambiarla."
          onClick={() => setMode("foto")}
        />
        <ModeCard
          icon={<BookIcon size={20} />}
          title="Empezar de una plantilla"
          description="Estructuras clásicas ya montadas — torso/pierna, empuje-tirón-pierna, cuerpo entero. Luego las ajustas."
          onClick={() => setMode("plantilla")}
        />
        <ModeCard
          icon={<EditIcon size={20} />}
          title="Montarla yo"
          description="Creas los días vacíos y vas añadiendo ejercicios uno a uno."
          onClick={() => setMode("manual")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => {
          setMode("elegir");
          setError(null);
        }}
        className="self-start text-xs font-semibold"
        style={{ color: "var(--accent-2)" }}
      >
        ← Otra forma
      </button>

      {error ? (
        <p
          role="alert"
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}

      {mode === "ia" ? (
        <AiForm onProposal={setProposal} onError={setError} />
      ) : mode === "foto" ? (
        <PhotoForm onProposal={setProposal} onError={setError} />
      ) : mode === "plantilla" ? (
        <TemplatePicker onPick={(input) => save(input, true)} pending={pending} />
      ) : (
        <ManualForm onCreate={(input) => save(input, true)} pending={pending} />
      )}
    </div>
  );
}

// =========================================================================

function ModeCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-panel tap-scale flex items-start gap-3 p-4 text-left"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
    </button>
  );
}

// =========================================================================

const EQUIPMENT_OPTIONS: Equipment[] = [
  "barra", "mancuernas", "polea", "maquina", "multipower",
  "kettlebell", "banda", "disco", "peso_corporal",
];

function AiForm({
  onProposal,
  onError,
}: {
  onProposal: (p: Proposal) => void;
  onError: (m: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    onError(null);
    try {
      const supabase = createClient();
      // `invokeAi` lee el cuerpo de la respuesta. `invoke` a secas deja el
      // motivo encerrado en el error y todo acababa en el mensaje genérico.
      const { data, fallo } = await invokeAi<Proposal>(supabase, "build-routine", {
        text,
        equipment: equipment.length ? equipment : undefined,
      });
      if (fallo) {
        onError(
          fallo.tipo === "sin_configurar"
            ? "La IA no está disponible ahora mismo. Puedes montar la rutina a mano mientras tanto."
            : mensajeDeFallo(fallo, "montar la rutina"),
        );
        return;
      }
      if (!data?.days?.length) {
        onError("No ha salido ninguna rutina de ahí. Prueba a decir cuántos días puedes entrenar y qué material tienes.");
        return;
      }
      onProposal(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-section">¿Cómo entrenas?</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={4000}
          className="input-field resize-none"
          placeholder="Puedo ir 4 días. Quiero ganar volumen, sobre todo espalda y hombro. Llevo dos años entrenando. Tengo molestias en el hombro derecho al hacer press por encima de la cabeza."
          autoFocus
        />
        <span className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          Cuanto más concreto, mejor sale: días que puedes ir, cuánto tiempo tienes, tu nivel,
          qué quieres priorizar y cualquier molestia o lesión.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-section">¿Qué tienes disponible?</span>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() =>
                setEquipment((prev) =>
                  prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq],
                )
              }
              data-active={equipment.includes(eq) ? "true" : undefined}
              className="btn-pill px-3 py-1.5 text-xs"
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          Si no marcas nada, cuenta con un gimnasio completo. El peso corporal siempre entra.
        </span>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading || text.trim().length < 10}
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {loading ? "Montando la rutina…" : "Montar la rutina"}
      </button>
    </div>
  );
}

// =========================================================================

function PhotoForm({
  onProposal,
  onError,
}: {
  onProposal: (p: Proposal) => void;
  onError: (m: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ preview: string; data: string; mimeType: string } | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function pick(file: File) {
    onError(null);
    try {
      const { data, mimeType } = await compressImageToBase64(file);
      setPhoto({ preview: URL.createObjectURL(file), data, mimeType });
    } catch {
      onError("No se ha podido leer esa imagen.");
    }
  }

  async function submit() {
    if (!photo) return;
    setLoading(true);
    onError(null);
    try {
      const supabase = createClient();
      const { data, fallo } = await invokeAi<Proposal>(supabase, "build-routine", {
        imageBase64: photo.data,
        imageMimeType: photo.mimeType,
        text: note.trim() || undefined,
      });
      if (fallo) {
        onError(
          fallo.tipo === "otro"
            ? "No se ha podido leer la rutina de la foto. Prueba con más luz o más cerca."
            : mensajeDeFallo(fallo, "leer la rutina"),
        );
        return;
      }
      if (!data?.days?.length) {
        onError(
          data?.warnings?.[0] ??
            "No se ha reconocido ninguna rutina en esa imagen. Asegúrate de que se lean los nombres de los ejercicios.",
        );
        return;
      }
      onProposal(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob local, no pasa por el optimizador
        <img
          src={photo.preview}
          alt="Rutina fotografiada"
          className="max-h-72 w-full rounded-2xl object-contain"
          style={{ background: "var(--surface-2)" }}
        />
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-secondary tap-scale flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]"
      >
        <CameraIcon size={16} />
        {photo ? "Cambiar foto" : "Hacer o elegir foto"}
      </button>

      <label className="flex flex-col gap-1.5">
        <span className="text-section">¿Algo que añadir? (opcional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          className="input-field resize-none"
          placeholder="La última columna son los kilos de la semana pasada, no el objetivo."
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={loading || !photo}
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {loading ? "Leyendo la rutina…" : "Leer la rutina"}
      </button>

      <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        Lee lo que hay escrito y lo traduce a ejercicios del catálogo. No cambia tu rutina:
        lo que no reconozca te lo dirá en vez de sustituirlo por otra cosa.
      </p>
    </div>
  );
}

// =========================================================================

function ProposalReview({
  proposal,
  pending,
  error,
  onBack,
  onAccept,
}: {
  proposal: Proposal;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onAccept: () => void;
}) {
  const totalSets = proposal.days.reduce(
    (n, d) => n + d.exercises.reduce((m, e) => m + e.targetSets, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-xs font-semibold"
        style={{ color: "var(--accent-2)" }}
      >
        ← Cambiar algo
      </button>

      <header className="flex flex-col gap-1">
        <h2 className="text-hero-title text-xl text-[var(--text-primary)]">{proposal.name}</h2>
        <p className="text-xs text-[var(--text-tertiary)]">
          {GOAL_LABELS[proposal.goal]} · {proposal.days.length} días · {totalSets} series por
          semana
        </p>
      </header>

      <p className="surface-soft p-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        {proposal.rationale}
      </p>

      {proposal.warnings.length > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-xl p-4"
          style={{ background: "var(--warning-soft)" }}
        >
          {proposal.warnings.map((w, i) => (
            <p
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed"
              style={{ color: "var(--warning)" }}
            >
              <AlertIcon size={15} className="mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      ) : null}

      {proposal.unmatched.length > 0 ? (
        <div className="surface-soft flex flex-col gap-1.5 p-4">
          <span className="text-section">No están en el catálogo</span>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {proposal.unmatched.join(", ")}
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            No se han incluido en vez de sustituirlos por algo parecido. Si los haces, créalos
            como ejercicio propio y añádelos luego a la rutina.
          </p>
        </div>
      ) : null}

      {proposal.days.map((day, i) => (
        <section key={i} className="surface-panel overflow-hidden">
          <header className="flex flex-col gap-0.5 px-4 pb-2 pt-4">
            <span className="text-base font-semibold text-[var(--text-primary)]">{day.name}</span>
            {day.notes ? (
              <span className="text-[11px] text-[var(--text-tertiary)]">{day.notes}</span>
            ) : null}
          </header>
          {day.exercises.map((ex, j) => (
            <div
              key={j}
              className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm text-[var(--text-primary)]">
                  {ex.exerciseName}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {MUSCLE_LABELS[ex.primaryMuscle]}
                  {ex.notes ? ` · ${ex.notes}` : ""}
                </span>
              </div>
              <span className="text-metric shrink-0 text-xs text-[var(--text-secondary)]">
                {ex.targetSets} × {ex.targetRepsMin}-{ex.targetRepsMax}
              </span>
            </div>
          ))}
        </section>
      ))}

      {error ? (
        <p
          role="alert"
          className="rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="btn-primary tap-scale flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        <CheckIcon size={16} />
        {pending ? "Guardando…" : "Usar esta rutina"}
      </button>

      <p className="text-center text-[11px] text-[var(--text-tertiary)]">
        Podrás cambiar series, repeticiones y ejercicios después. Nada de esto es definitivo.
      </p>
    </div>
  );
}

// =========================================================================

function TemplatePicker({
  onPick,
  pending,
}: {
  onPick: (input: Parameters<typeof createRoutine>[0]) => void;
  pending: boolean;
}) {
  const [chosen, setChosen] = useState<RoutineTemplate | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {ROUTINE_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setChosen(chosen?.id === t.id ? null : t)}
          data-active={chosen?.id === t.id ? "true" : undefined}
          className="surface-panel tap-scale flex flex-col gap-1.5 p-4 text-left"
          style={
            chosen?.id === t.id
              ? { borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" }
              : undefined
          }
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {t.days.length} días · {GOAL_LABELS[t.goal]}
          </span>
          <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {t.description}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {t.days.map((d) => d.name).join(" · ")}
          </span>
        </button>
      ))}

      <button
        type="button"
        disabled={!chosen || pending}
        onClick={() =>
          chosen &&
          onPick({
            name: chosen.name,
            goal: chosen.goal,
            notes: chosen.description,
            source: "plantilla",
            days: chosen.days.map((d) => ({ name: d.name, notes: null, exercises: [] })),
          })
        }
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {pending ? "Creando…" : "Crear con esta estructura"}
      </button>

      <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        La plantilla crea los días vacíos con su nombre. Los ejercicios los eliges tú después,
        del catálogo — no se rellenan solos porque la elección depende del material que tengas
        y de lo que te siente bien.
      </p>
    </div>
  );
}

// =========================================================================

function ManualForm({
  onCreate,
  pending,
}: {
  onCreate: (input: Parameters<typeof createRoutine>[0]) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<RoutineGoal>("hipertrofia");
  const [dayNames, setDayNames] = useState<string[]>(["Día 1", "Día 2", "Día 3"]);

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-section">Nombre de la rutina</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="input-field"
          placeholder="Mi rutina de volumen"
          autoFocus
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
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-section">Días</span>
        {dayNames.map((dn, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={dn}
              onChange={(e) =>
                setDayNames((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
              maxLength={60}
              className="input-field flex-1"
              placeholder={`Día ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => setDayNames((prev) => prev.filter((_, j) => j !== i))}
              disabled={dayNames.length <= 1}
              aria-label={`Quitar el día ${i + 1}`}
              className="tap-scale shrink-0 px-2 text-xs text-[var(--text-tertiary)] disabled:opacity-30"
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDayNames((prev) => [...prev, `Día ${prev.length + 1}`])}
          disabled={dayNames.length >= 14}
          className="btn-pill self-start px-3 py-1.5 text-xs"
        >
          Añadir día
        </button>
      </div>

      <button
        type="button"
        disabled={pending || name.trim() === "" || dayNames.some((d) => !d.trim())}
        onClick={() =>
          onCreate({
            name: name.trim(),
            goal,
            source: "manual",
            days: dayNames.map((d) => ({ name: d.trim(), notes: null, exercises: [] })),
          })
        }
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        {pending ? "Creando…" : "Crear rutina"}
      </button>

      <p className="text-[11px] text-[var(--text-tertiary)]">
        Se crean los días vacíos y a continuación vas añadiendo los ejercicios de cada uno.
      </p>
    </div>
  );
}
