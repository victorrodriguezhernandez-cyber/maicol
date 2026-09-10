import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getCurrentGoal,
  getMealsForDate,
  getProfileDisplayName,
  sumMealItems,
  sumMeals,
} from "@/lib/data/nutrition";
import { formatKcal, todayLocalDateString, localHour } from "@/lib/format";
import { RingProgress } from "@/components/ui/RingProgress";
import { MacroDashboard } from "@/components/dashboard/MacroDashboard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MealGroup, type MealGroupItem } from "@/components/dashboard/MealGroup";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "snack", "dinner"] as const;

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);
  if (!goal) redirect("/onboarding");

  const displayName = await getProfileDisplayName(supabase, user.id);
  const firstName = displayName?.split(" ")[0] ?? null;
  const hour = localHour();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  const today = todayLocalDateString();
  const meals = await getMealsForDate(supabase, user.id, today);
  const totals = sumMeals(meals);

  const remaining = goal.kcal - totals.energy_kcal;
  const pct = goal.kcal > 0 ? Math.round(Math.min(100, (totals.energy_kcal / goal.kcal) * 100)) : 0;

  // Group by meal TYPE, not by individual `meals` row — several logged
  // entries of the same type on the same day (e.g. two breakfasts)
  // collapse into one timeline block. Every canonical type always
  // renders (even with zero items) so the timeline itself reads as
  // deliberate rather than empty when little is logged yet; "other" is
  // the one exception, shown only when it actually has something.
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
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-meta">{greeting}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="text-hero-title text-[1.6rem] text-[var(--text-primary)]">Hoy</h1>
        </div>
      </div>

      {/* Hero: the one dashboard panel that dominates the screen. */}
      <section className="surface-hero flex items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-section">Calorías de hoy</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-display text-[2.75rem] text-[var(--text-primary)]">
              {Math.round(totals.energy_kcal).toLocaleString("es-ES")}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">de {goal.kcal.toLocaleString("es-ES")} kcal</p>
          <p
            className="mt-1.5 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: remaining >= 0 ? "var(--accent-soft)" : "color-mix(in srgb, var(--warning) 16%, transparent)",
              color: remaining >= 0 ? "var(--accent)" : "var(--warning)",
            }}
          >
            {remaining >= 0
              ? `${formatKcal(remaining)} disponibles`
              : `${formatKcal(Math.abs(remaining))} por encima`}
          </p>
        </div>
        <RingProgress value={totals.energy_kcal} max={goal.kcal} size={92} strokeWidth={9} glow>
          <span className="text-metric text-lg text-[var(--text-primary)]">{pct}%</span>
        </RingProgress>
      </section>

      {/* Macros: one tight 2×2 dashboard, not four stacked form rows. */}
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

      {/* Comidas: all four moments of the day, always visible. */}
      <section className="flex flex-col gap-2.5">
        <SectionHeader>Comidas de hoy</SectionHeader>
        <div className="flex flex-col gap-2">
          {orderedGroups.map((g) => (
            <MealGroup key={g.type} type={g.type} totalKcal={g.totalKcal} items={g.items} />
          ))}
        </div>
      </section>
    </div>
  );
}
