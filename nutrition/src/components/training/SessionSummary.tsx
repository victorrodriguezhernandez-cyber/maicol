import Link from "next/link";
import type { SessionExercise, TrainingSessionRow } from "@/lib/training/types";
import { isTimeBased, numberWorkingSets } from "@/lib/training/types";
import { sessionVolumeKg, formatKg, formatDuration } from "@/lib/training/records";
import { formatWeekday } from "@/lib/training/week";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { ChevronRightIcon, TimerIcon, FlameIcon, DumbbellIcon } from "@/components/ui/icons";

/**
 * Un entreno ya cerrado.
 *
 * Es de sólo lectura y es un componente de servidor: no hay nada que
 * editar aquí, así que no hay razón para mandar JavaScript al móvil para
 * pintarlo. Lo único interactivo (borrar) va en su propia isla.
 */
export function SessionSummary({
  session,
  exercises,
}: {
  session: TrainingSessionRow;
  exercises: SessionExercise[];
}) {
  const allSets = exercises.flatMap((e) => e.sets).filter((s) => s.completed_at);
  const volumeKg = sessionVolumeKg(
    allSets.map((s) => ({
      id: s.id,
      weightKg: s.weight_kg,
      reps: s.reps,
      durationSeconds: s.duration_seconds,
      setType: s.set_type,
      completedAt: s.completed_at!,
      sessionId: s.session_id,
    })),
  );
  const workingSets = allSets.filter((s) => s.set_type !== "calentamiento");

  return (
    <div className="flex flex-col gap-6 pb-6">
      <header className="flex flex-col gap-1">
        <p className="text-meta">{formatWeekday(session.session_date)}</p>
        <h1 className="text-hero-title text-[1.6rem] text-[var(--text-primary)]">
          {session.title ?? "Entreno"}
        </h1>
      </header>

      <div className="surface-hero grid grid-cols-3 gap-2 p-4">
        <Stat
          icon={<DumbbellIcon size={16} />}
          value={String(workingSets.length)}
          label="series"
        />
        <Stat
          icon={<FlameIcon size={16} />}
          value={volumeKg > 0 ? formatKg(volumeKg) : "—"}
          label={volumeKg > 0 ? "kg movidos" : "sin carga"}
        />
        <Stat
          icon={<TimerIcon size={16} />}
          value={session.duration_min ? String(session.duration_min) : "—"}
          label="minutos"
        />
      </div>

      {session.perceived_effort != null ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Esfuerzo percibido: <span className="text-metric text-[var(--text-primary)]">{session.perceived_effort}/10</span>
        </p>
      ) : null}

      {session.notes ? (
        <p className="surface-soft p-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {session.notes}
        </p>
      ) : null}

      {exercises.map((entry) => {
        const done = entry.sets.filter((s) => s.completed_at);
        if (done.length === 0) return null;
        const timeBased = isTimeBased(entry.exercise);
        const labels = numberWorkingSets(done);

        return (
          <section key={`${entry.position}-${entry.exercise.id}`} className="surface-panel overflow-hidden">
            <Link
              href={`/entreno/ejercicios/${entry.exercise.id}`}
              className="flex items-center justify-between gap-2 px-4 py-3.5"
            >
              <span className="truncate text-base font-semibold text-[var(--text-primary)]">
                {entry.exercise.name}
              </span>
              <ChevronRightIcon size={16} className="shrink-0 text-[var(--text-tertiary)]" />
            </Link>

            {done.map((set) => {
              return (
                <div
                  key={set.id}
                  className="flex flex-col gap-1 border-t border-[var(--border-soft)] px-4 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-metric text-sm text-[var(--text-tertiary)]">
                      {labels.get(set.id) ?? "?"}
                    </span>
                    <span className="text-metric text-sm text-[var(--text-primary)]">
                      {timeBased && set.duration_seconds != null
                        ? formatDuration(set.duration_seconds)
                        : `${set.weight_kg != null ? `${formatKg(set.weight_kg)} kg` : "—"} × ${set.reps ?? "—"}`}
                      {set.rir != null ? (
                        <span className="text-xs text-[var(--text-tertiary)]"> · RIR {set.rir}</span>
                      ) : null}
                    </span>
                  </div>
                  {set.notes ? (
                    <p className="text-[11px] italic text-[var(--text-secondary)]">{set.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </section>
        );
      })}

      <DeleteSessionButton sessionId={session.id} />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ color: "var(--accent-2)" }}>{icon}</span>
      <span className="text-display text-xl text-[var(--text-primary)]">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
    </div>
  );
}
