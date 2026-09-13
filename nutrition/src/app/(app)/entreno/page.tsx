import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getActiveRoutine,
  getOpenSession,
  getRecentSessions,
  getVolumeBetween,
  getMuscleLevels,
} from "@/lib/data/training";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StartDayButton } from "@/components/training/StartDayButton";
import { PhysiqueCard } from "@/components/training/PhysiqueCard";
import { sessionVolumeKg, formatKg } from "@/lib/training/records";
import { weekBounds, formatWeekday } from "@/lib/training/week";
import {
  DumbbellIcon,
  ChevronRightIcon,
  PlayIcon,
  ListIcon,
  BodyIcon,
  HistoryIcon,
} from "@/components/ui/icons";

export const metadata = { title: "Entreno" };

export default async function EntrenoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const { start, end } = weekBounds(new Date());

  // Cuatro lecturas independientes: un viaje, no cuatro encadenados.
  const [routine, openSession, recent, volume, physique] = await Promise.all([
    getActiveRoutine(supabase, user.id),
    getOpenSession(supabase, user.id),
    getRecentSessions(supabase, user.id, 8),
    getVolumeBetween(supabase, user.id, start.toISOString(), end.toISOString()),
    getMuscleLevels(supabase, user.id),
  ]);

  return (
    <PageShell
      eyebrow="Fuerza y volumen"
      title="Entreno"
      trailing={
        <Link
          href="/entreno/rutinas"
          className="btn-pill text-xs"
          aria-label="Ver mis rutinas"
        >
          <ListIcon size={14} /> Rutinas
        </Link>
      }
    >
      {openSession ? (
        <Link
          href={`/entreno/sesion/${openSession.id}`}
          className="surface-hero tap-scale flex items-center justify-between gap-3 p-5"
          style={{ borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-section" style={{ color: "var(--accent-2)" }}>
              Entreno en curso
            </span>
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {openSession.title ?? "Entreno"}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Toca para seguir donde lo dejaste
            </span>
          </div>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <PlayIcon size={20} />
          </span>
        </Link>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader
          action={
            routine ? (
              <Link
                href={`/entreno/rutinas/${routine.id}`}
                className="text-xs font-semibold"
                style={{ color: "var(--accent-2)" }}
              >
                Editar
              </Link>
            ) : null
          }
        >
          {routine ? routine.name : "Tu rutina"}
        </SectionHeader>

        {routine ? (
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {routine.routine_days.map((day) => (
              <div key={day.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {day.name}
                  </span>
                  <span className="truncate text-xs text-[var(--text-tertiary)]">
                    {day.routine_exercises.length === 0
                      ? "Sin ejercicios todavía"
                      : day.routine_exercises
                          .map((e) => e.exercises.name)
                          .slice(0, 3)
                          .join(" · ") +
                        (day.routine_exercises.length > 3
                          ? ` +${day.routine_exercises.length - 3}`
                          : "")}
                  </span>
                </div>
                <StartDayButton
                  routineDayId={day.id}
                  dayName={day.name}
                  emptyHref={
                    day.routine_exercises.length === 0
                      ? `/entreno/rutinas/${routine.id}`
                      : null
                  }
                  hasOpenSession={Boolean(openSession)}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Todavía no tienes una rutina activa"
            description="Créala tú, dile a la IA cómo entrenas y te la monta, o haz una foto a la que ya sigues."
            action={
              <Link
                href="/entreno/rutinas/nueva"
                className="btn-primary tap-scale rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
              >
                Crear una rutina
              </Link>
            }
          />
        )}

        {!openSession ? (
          <StartDayButton
            routineDayId={null}
            dayName="Entreno libre"
            variant="secondary"
            hasOpenSession={false}
          />
        ) : null}
      </section>

      <PhysiqueCard
        levels={physique.levels}
        stats={physique.stats}
        volume={volume}
        sessionsLogged={recent.length}
      />

      <section className="flex flex-col gap-3">
        <SectionHeader
          action={
            <Link
              href="/entreno/ejercicios"
              className="text-xs font-semibold"
              style={{ color: "var(--accent-2)" }}
            >
              Ejercicios
            </Link>
          }
        >
          Últimos entrenos
        </SectionHeader>

        {recent.length === 0 ? (
          <EmptyState
            title="Aún no has registrado ningún entreno"
            description="En cuanto termines el primero aparecerá aquí, con su volumen y su duración."
          />
        ) : (
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {recent.map((session) => {
              const sets = session.workout_sets.filter((s) => s.completed_at);
              const volumeKg = sessionVolumeKg(
                sets.map((s) => ({
                  id: s.id,
                  weightKg: s.weight_kg,
                  reps: s.reps,
                  durationSeconds: s.duration_seconds,
                  setType: s.set_type,
                  completedAt: s.completed_at!,
                  sessionId: s.session_id,
                })),
              );
              return (
                <Link
                  key={session.id}
                  href={`/entreno/sesion/${session.id}`}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
                    >
                      <DumbbellIcon size={17} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {session.title ?? "Entreno"}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatWeekday(session.session_date)} · {sets.length} series
                        {volumeKg > 0 ? ` · ${formatKg(volumeKg)} kg` : ""}
                        {session.duration_min ? ` · ${session.duration_min} min` : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon size={16} className="shrink-0 text-[var(--text-tertiary)]" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/entreno/musculos" className="surface-soft tap-scale flex flex-col gap-2 p-4">
          <BodyIcon size={20} style={{ color: "var(--accent-2)" }} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Por músculo</span>
          <span className="text-xs text-[var(--text-secondary)]">
            El mapa del cuerpo y la evolución de cada grupo
          </span>
        </Link>
        <Link href="/entreno/ejercicios" className="surface-soft tap-scale flex flex-col gap-2 p-4">
          <HistoryIcon size={20} style={{ color: "var(--accent-2)" }} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Ejercicios</span>
          <span className="text-xs text-[var(--text-secondary)]">
            Catálogo, historial y récords
          </span>
        </Link>
      </div>
    </PageShell>
  );
}
