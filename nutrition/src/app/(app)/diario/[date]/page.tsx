import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal, getMealsForDate, sumMealItems, sumMeals } from "@/lib/data/nutrition";
import { formatDateHeader, todayLocalDateString } from "@/lib/format";
import { RingProgress } from "@/components/ui/RingProgress";
import { MacroDashboard } from "@/components/dashboard/MacroDashboard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MealGroup, type MealGroupItem } from "@/components/dashboard/MealGroup";
import { DayStatusPicker } from "@/components/dashboard/DayStatusPicker";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "snack", "dinner"] as const;

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
  const pct = goal && goal.kcal > 0 ? Math.round(Math.min(100, (totals.energy_kcal / goal.kcal) * 100)) : 0;

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
  const allTypes = [...MEAL_TYPE_ORDER, ...(groups.has("other") ? (["other"] as const) : [])];
  const orderedGroups = allTypes.map((t) => ({ type: t, ...(groups.get(t) ?? { totalKcal: 0, items: [] }) }));

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          {isToday ? <p className="text-meta">Hoy</p> : null}
          <h1 className="text-hero-title truncate text-[1.4rem] text-[var(--text-primary)]">
            {formatDateHeader(new Date(`${date}T12:00:00`))}
          </h1>
        </div>
        <DayStatusPicker date={date} current={status} />
      </div>

      {goal ? (
        <>
          <section className="surface-hero flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-section">Calorías</p>
              <p className="text-display text-[1.9rem] text-[var(--text-primary)]">
                {Math.round(totals.energy_kcal).toLocaleString("es-ES")}
                <span className="text-xs font-normal text-[var(--text-tertiary)]"> / {goal.kcal.toLocaleString("es-ES")} kcal</span>
              </p>
            </div>
            <RingProgress value={totals.energy_kcal} max={goal.kcal} size={58} strokeWidth={6}>
              <span className="text-metric text-xs text-[var(--text-primary)]">{pct}%</span>
            </RingProgress>
          </section>
          <MacroDashboard
            macros={[
              { label: "Proteína", value: totals.protein_g, goal: goal.protein_g, color: "var(--metric-protein)" },
              { label: "Carbos", value: totals.carbohydrates_g, goal: goal.carbohydrates_g, color: "var(--metric-carbs)" },
              { label: "Grasas", value: totals.fat_g, goal: goal.fat_g, color: "var(--metric-fat)" },
              ...(goal.fiber_g
                ? [{ label: "Fibra", value: totals.fiber_g ?? 0, goal: goal.fiber_g, color: "var(--metric-fiber)" }]
                : []),
            ]}
          />
        </>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <SectionHeader>Comidas</SectionHeader>
        <div className="flex flex-col gap-2">
          {orderedGroups.map((g) => (
            <MealGroup key={g.type} type={g.type} totalKcal={g.totalKcal} items={g.items} />
          ))}
        </div>
      </section>
    </div>
  );
}
