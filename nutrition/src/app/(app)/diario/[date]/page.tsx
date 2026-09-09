import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal, getMealsForDate, sumMealItems, sumMeals } from "@/lib/data/nutrition";
import { formatDateHeader, todayLocalDateString } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { RingProgress } from "@/components/ui/RingProgress";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { MetricBar } from "@/components/ui/MetricBar";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MealGroup, type MealGroupItem } from "@/components/dashboard/MealGroup";
import { DayStatusPicker } from "@/components/dashboard/DayStatusPicker";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "snack", "dinner", "other"] as const;

export default async function DiaryDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [goal, meals, dayLog] = await Promise.all([
    getCurrentGoal(supabase, user.id),
    getMealsForDate(supabase, user.id, date),
    supabase
      .from("day_logs")
      .select("status")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  const totals = sumMeals(meals);
  const status = (dayLog?.status ?? (meals.length > 0 ? "partial" : "not_logged")) as
    | "complete"
    | "partial"
    | "not_logged";
  const isToday = date === todayLocalDateString();

  const groups = new Map<string, { totalKcal: number; items: MealGroupItem[] }>();
  for (const meal of meals) {
    const mealTotals = sumMealItems(meal.meal_items);
    const g = groups.get(meal.meal_type) ?? { totalKcal: 0, items: [] };
    g.totalKcal += mealTotals.energy_kcal;
    for (const item of meal.meal_items) {
      g.items.push({ key: item.id, name: item.name, kcal: item.energy_kcal, mealId: meal.id });
    }
    groups.set(meal.meal_type, g);
  }
  const orderedGroups = MEAL_TYPE_ORDER.filter((t) => groups.has(t)).map((t) => ({
    type: t,
    ...groups.get(t)!,
  }));

  return (
    <PageShell
      eyebrow={isToday ? "Hoy" : undefined}
      title={formatDateHeader(new Date(`${date}T12:00:00`))}
      trailing={<DayStatusPicker date={date} current={status} />}
    >
      {goal ? (
        <>
          <section className="surface-soft px-5 py-4">
            <HeroMetric
              eyebrow="Calorías"
              value={Math.round(totals.energy_kcal).toLocaleString("es-ES")}
              unit={`/ ${goal.kcal.toLocaleString("es-ES")} kcal`}
              ring={<RingProgress value={totals.energy_kcal} max={goal.kcal} size={58} strokeWidth={6} />}
            />
          </section>
          <section className="flex flex-col gap-3.5">
            <MetricBar label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="var(--metric-protein)" />
            <MetricBar label="Carbohidratos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="var(--metric-carbs)" />
            <MetricBar label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="var(--metric-fat)" />
          </section>
        </>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionHeader>Comidas</SectionHeader>
        {orderedGroups.length === 0 ? (
          <EmptyState title="Sin comidas registradas este día" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {orderedGroups.map((g) => (
              <MealGroup key={g.type} type={g.type} totalKcal={g.totalKcal} items={g.items} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
