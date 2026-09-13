import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getVolumeBetween, getMuscleLevels, getRecentSessions } from "@/lib/data/training";
import { weekBoundsAgo } from "@/lib/training/week";
import { MuscleEvolution } from "@/components/training/MuscleEvolution";
import { PageShell } from "@/components/ui/PageShell";

export const metadata = { title: "Por músculo" };

/** Cuántas semanas de historia se traen para la evolución. */
const WEEKS = 8;

export default async function MusculosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  // Ocho consultas en paralelo, una por semana. Se podría hacer con una
  // sola agrupando por semana en SQL, pero eso exigiría una función en la
  // base de datos que replicara las reglas de reparto de `volume.ts`
  // (media serie a los secundarios, el calentamiento no cuenta) — y esas
  // reglas estarían entonces en dos sitios. Prefiero ocho lecturas
  // baratas a dos verdades sobre cómo se cuenta una serie.
  const [physique, recent] = await Promise.all([
    getMuscleLevels(supabase, user.id),
    getRecentSessions(supabase, user.id, 1),
  ]);

  const weeks = await Promise.all(
    Array.from({ length: WEEKS }, async (_, i) => {
      const { start, end } = weekBoundsAgo(i);
      return {
        weeksAgo: i,
        volume: await getVolumeBetween(
          supabase,
          user.id,
          start.toISOString(),
          end.toISOString(),
        ),
      };
    }),
  );

  return (
    <PageShell eyebrow="Últimas 8 semanas" title="Por músculo">
      <MuscleEvolution
        weeks={weeks}
        levels={physique.levels}
        stats={physique.stats}
        sessionsLogged={recent.length}
      />
    </PageShell>
  );
}
