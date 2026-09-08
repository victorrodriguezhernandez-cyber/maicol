import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGoal } from "@/lib/data/nutrition";
import { GoalEditorForm } from "@/components/settings/GoalEditorForm";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ObjetivosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);

  const { data: history } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("effective_from", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Objetivos nutricionales</h1>

      {goal ? (
        <GoalEditorForm goal={goal} />
      ) : (
        <EmptyState title="No tienes objetivos configurados" description="Completa el onboarding primero." />
      )}

      {history && history.length > 1 ? (
        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Historial de objetivos</p>
          <ul className="flex flex-col gap-1.5">
            {history.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <span className="text-[var(--text-secondary)]">
                  {g.effective_from} – {g.effective_to ?? "actualidad"}
                </span>
                <span className="font-medium text-[var(--text-primary)]">{g.kcal} kcal</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
