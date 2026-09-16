import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal } from "@/lib/data/nutrition";
import { getTrainingGoal } from "@/lib/data/training";
import { GoalEditorForm } from "@/components/settings/GoalEditorForm";
import { TrainingGoalForm } from "@/components/settings/TrainingGoalForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";

const MODE_LABELS: Record<string, string> = {
  lose: "bajar de peso",
  gain: "subir de peso",
  maintain: "mantener el peso",
};

/**
 * Los dos objetivos en la misma pantalla, a propósito.
 *
 * Son una sola cosa en la cabeza de quien entrena: "quiero más fuerza y
 * bajar algo de barriga". Están en dos tablas porque los usan cálculos
 * distintos — las calorías salen de `nutrition_goals`, el rango de
 * repeticiones de `training_goals` — pero tenerlos en pantallas
 * separadas obligaría a acordarse de cambiar dos sitios.
 */
export default async function ObjetivosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [goal, trainingGoal, { data: history }] = await Promise.all([
    getCurrentGoal(supabase, user.id),
    getTrainingGoal(supabase, user.id),
    supabase
      .from("nutrition_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(10),
  ]);

  return (
    <PageShell title="Objetivos">
      <section className="flex flex-col gap-3">
        <SectionHeader>Qué persigo entrenando</SectionHeader>
        {goal ? (
          <p className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            En comida tu objetivo es {MODE_LABELS[goal.mode] ?? goal.mode}, con{" "}
            <span className="text-metric">{goal.kcal}</span> kcal al día. Lo de abajo es lo otro:
            qué quieres sacar del entreno.
          </p>
        ) : null}
        <TrainingGoalForm goal={trainingGoal} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader>Calorías y macros</SectionHeader>
        {goal ? (
          <GoalEditorForm goal={goal} />
        ) : (
          <EmptyState
            title="No tienes objetivos configurados"
            description="Completa el onboarding primero."
          />
        )}
      </section>

      {history && history.length > 1 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader>Historial de objetivos</SectionHeader>
          <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
            {history.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2.5 text-xs">
                <span className="text-[var(--text-secondary)]">
                  {g.effective_from} – {g.effective_to ?? "actualidad"}
                </span>
                <span className="text-metric font-semibold text-[var(--text-primary)]">
                  {g.kcal} kcal
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}
