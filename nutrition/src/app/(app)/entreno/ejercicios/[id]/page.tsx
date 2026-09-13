import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { getExercise, getExerciseHistory } from "@/lib/data/training";
import { formatKg, formatDuration, ONE_RM_MAX_REPS } from "@/lib/training/records";
import { formatWeekday } from "@/lib/training/week";
import { MUSCLE_LABELS } from "@/lib/training/muscles";
import { EQUIPMENT_LABELS, PATTERN_LABELS, isTimeBased } from "@/lib/training/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrophyIcon, ChevronRightIcon } from "@/components/ui/icons";

export default async function EjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [exercise, { history, records }] = await Promise.all([
    getExercise(supabase, id),
    getExerciseHistory(supabase, id),
  ]);
  if (!exercise) notFound();

  const timeBased = isTimeBased(exercise);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-col gap-2">
        <p className="text-meta">
          {MUSCLE_LABELS[exercise.primary_muscle]} · {EQUIPMENT_LABELS[exercise.equipment]}
        </p>
        <h1 className="text-hero-title text-[1.6rem] text-[var(--text-primary)]">
          {exercise.name}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <Tag>{exercise.mechanic === "compuesto" ? "Compuesto" : "Aislamiento"}</Tag>
          <Tag>{PATTERN_LABELS[exercise.pattern]}</Tag>
          {exercise.is_unilateral ? <Tag>Unilateral</Tag> : null}
          {exercise.secondary_muscles.map((m) => (
            <Tag key={m}>También: {MUSCLE_LABELS[m].toLowerCase()}</Tag>
          ))}
        </div>
      </header>

      {exercise.cues ? (
        <section className="surface-soft flex flex-col gap-1.5 p-4">
          <span className="text-section">Cómo se hace</span>
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {exercise.cues}
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader>Tus récords</SectionHeader>
        {records.totalSets === 0 ? (
          <EmptyState
            title="Todavía no has hecho este ejercicio"
            description="En cuanto registres la primera serie empezarán a salir aquí tus marcas."
          />
        ) : (
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {records.heaviest ? (
              <RecordRow
                label="Más peso"
                value={`${formatKg(records.heaviest.weightKg)} kg × ${records.heaviest.reps}`}
                when={records.heaviest.at}
              />
            ) : null}
            {records.bestEstimatedOneRm ? (
              <RecordRow
                label="Máximo estimado"
                value={`${formatKg(records.bestEstimatedOneRm.value)} kg`}
                when={records.bestEstimatedOneRm.at}
                note={`Calculado desde ${formatKg(records.bestEstimatedOneRm.weightKg)} kg × ${records.bestEstimatedOneRm.reps}`}
              />
            ) : null}
            {records.mostReps ? (
              <RecordRow
                label="Más repeticiones"
                value={`${records.mostReps.reps}${records.mostReps.weightKg != null ? ` × ${formatKg(records.mostReps.weightKg)} kg` : ""}`}
                when={records.mostReps.at}
              />
            ) : null}
            {records.longestHold ? (
              <RecordRow
                label="Más tiempo"
                value={formatDuration(records.longestHold.durationSeconds)}
                when={records.longestHold.at}
              />
            ) : null}
            {records.bestSessionVolume ? (
              <RecordRow
                label="Mejor sesión"
                value={`${formatKg(records.bestSessionVolume.volumeKg)} kg de volumen`}
                when={records.bestSessionVolume.at}
              />
            ) : null}
          </div>
        )}

        {records.bestEstimatedOneRm ? (
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            El máximo estimado sale de la fórmula de Epley (peso × (1 + reps/30)) y sólo se
            calcula con series de hasta {ONE_RM_MAX_REPS} repeticiones: por encima de ahí la
            fórmula deja de ser fiable, así que la app prefiere no dar un número antes que dar
            uno que parece exacto y no lo es.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader>Historial</SectionHeader>
        {history.length === 0 ? (
          <EmptyState title="Sin series registradas todavía" />
        ) : (
          history.map((entry) => {
            return (
              <Link
                key={entry.sessionId}
                href={`/entreno/sesion/${entry.sessionId}`}
                className="surface-panel flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatWeekday(entry.date)}
                  </span>
                  <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-[var(--border-soft)] px-4 py-3">
                  {entry.sets.map((s) => {
                    return (
                      <span
                        key={s.id}
                        className="text-metric rounded-lg px-2 py-1 text-xs"
                        style={{
                          background:
                            s.set_type === "calentamiento"
                              ? "var(--surface-2)"
                              : "var(--accent-soft)",
                          color:
                            s.set_type === "calentamiento"
                              ? "var(--text-tertiary)"
                              : "var(--text-primary)",
                        }}
                      >
                        {timeBased && s.duration_seconds != null
                          ? formatDuration(s.duration_seconds)
                          : `${s.weight_kg != null ? formatKg(s.weight_kg) : "–"}×${s.reps ?? "–"}`}
                      </span>
                    );
                  })}
                </div>
              </Link>
            );
          })
        )}
      </section>

      {exercise.user_id ? (
        <Link
          href={`/entreno/ejercicios/${exercise.id}/editar`}
          className="btn-secondary tap-scale rounded-xl py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
        >
          Editar este ejercicio
        </Link>
      ) : (
        <p className="text-center text-[11px] text-[var(--text-tertiary)]">
          Este ejercicio es del catálogo compartido y no se puede editar. Si lo haces distinto,
          crea uno propio desde{" "}
          <Link href="/entreno/ejercicios/nuevo" style={{ color: "var(--accent-2)" }}>
            Nuevo ejercicio
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
    >
      {children}
    </span>
  );
}

function RecordRow({
  label,
  value,
  when,
  note,
}: {
  label: string;
  value: string;
  when: string;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
      >
        <TrophyIcon size={15} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <span className="text-metric text-sm text-[var(--text-primary)]">{value}</span>
        {note ? <span className="text-[10px] text-[var(--text-tertiary)]">{note}</span> : null}
      </div>
      <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
        {formatWeekday(when.slice(0, 10))}
      </span>
    </div>
  );
}
