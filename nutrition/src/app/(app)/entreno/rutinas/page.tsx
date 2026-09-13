import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRoutines } from "@/lib/data/training";
import { GOAL_LABELS, SOURCE_LABELS } from "@/lib/training/types";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RoutineActiveToggle } from "@/components/training/RoutineActiveToggle";
import { PlusIcon, ChevronRightIcon } from "@/components/ui/icons";

export const metadata = { title: "Rutinas" };

export default async function RutinasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [active, archived] = await Promise.all([
    getRoutines(supabase, user.id),
    getRoutines(supabase, user.id, { includeArchived: true }),
  ]);
  const onlyArchived = archived.filter((r) => r.archived_at);

  return (
    <PageShell
      eyebrow="Tus planes de entreno"
      title="Rutinas"
      trailing={
        <Link href="/entreno/rutinas/nueva" className="btn-pill text-xs">
          <PlusIcon size={13} /> Nueva
        </Link>
      }
    >
      {active.length === 0 ? (
        <EmptyState
          title="Todavía no tienes ninguna rutina"
          description="Puedes escribirla tú, contarle a la IA cómo entrenas para que te la monte, o hacerle una foto a la que ya sigues."
          action={
            <Link
              href="/entreno/rutinas/nueva"
              className="btn-primary tap-scale rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)]"
            >
              Crear una rutina
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((routine) => (
            <div key={routine.id} className="surface-panel flex flex-col gap-3 p-4">
              <Link href={`/entreno/rutinas/${routine.id}`} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-base font-semibold text-[var(--text-primary)]">
                    {routine.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {GOAL_LABELS[routine.goal]} · {SOURCE_LABELS[routine.source]}
                  </span>
                </div>
                <ChevronRightIcon size={16} className="mt-1 shrink-0 text-[var(--text-tertiary)]" />
              </Link>
              <RoutineActiveToggle routineId={routine.id} isActive={routine.is_active} />
            </div>
          ))}
        </div>
      )}

      {onlyArchived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeader>Archivadas</SectionHeader>
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {onlyArchived.map((routine) => (
              <Link
                key={routine.id}
                href={`/entreno/rutinas/${routine.id}`}
                className="flex items-center justify-between gap-3 p-4"
              >
                <span className="truncate text-sm text-[var(--text-secondary)]">
                  {routine.name}
                </span>
                <ChevronRightIcon size={15} className="shrink-0 text-[var(--text-tertiary)]" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
