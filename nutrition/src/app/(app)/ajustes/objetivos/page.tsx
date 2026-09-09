import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal } from "@/lib/data/nutrition";
import { GoalEditorForm } from "@/components/settings/GoalEditorForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function ObjetivosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);

  const { data: history } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("effective_from", { ascending: false })
    .limit(10);

  return (
    <PageShell title="Objetivos nutricionales">
      {goal ? (
        <GoalEditorForm goal={goal} />
      ) : (
        <EmptyState title="No tienes objetivos configurados" description="Completa el onboarding primero." />
      )}

      {history && history.length > 1 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader>Historial de objetivos</SectionHeader>
          <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
            {history.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2.5 text-xs">
                <span className="text-[var(--text-secondary)]">
                  {g.effective_from} – {g.effective_to ?? "actualidad"}
                </span>
                <span className="text-metric font-semibold text-[var(--text-primary)]">{g.kcal} kcal</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}
