import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  getCurrentGoal,
  getMealsForDate,
  getProfileDisplayName,
  getWeightEntriesSince,
  sumMealItems,
  sumMeals,
} from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import {
  formatKcal,
  formatKg,
  formatSignedKgPerWeek,
  todayLocalDateString,
  localHour,
} from "@/lib/format";
import { RingProgress } from "@/components/ui/RingProgress";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { MetricBar } from "@/components/ui/MetricBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PageShell } from "@/components/ui/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MealGroup, type MealGroupItem } from "@/components/dashboard/MealGroup";
import { TrendIcon } from "@/components/ui/icons";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "snack", "dinner", "other"] as const;

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

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const weightEntries = await getWeightEntriesSince(supabase, user.id, since.toISOString());
  const trendPoints = computeWeightTrend(
    weightEntries.map((w) => ({ measuredAt: w.measured_at, weightKg: w.weight_kg })),
  );
  const weeklyRate =
    goal.mode !== "maintain"
      ? computeWeeklyRate(trendPoints, {
          targetMinKgPerWeek: goal.weekly_rate_min_kg ?? undefined,
          targetMaxKgPerWeek: goal.weekly_rate_max_kg ?? undefined,
        })
      : computeWeeklyRate(trendPoints);

  const lastTrend = trendPoints.at(-1);
  const remaining = goal.kcal - totals.energy_kcal;
  const pct = goal.kcal > 0 ? Math.round(Math.min(100, (totals.energy_kcal / goal.kcal) * 100)) : 0;

  // Group by meal TYPE, not by individual `meals` row — several logged
  // entries of the same type on the same day (e.g. two breakfasts)
  // collapse into one timeline block (see MealGroup.tsx).
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
    <PageShell eyebrow={`${greeting}${firstName ? `, ${firstName}` : ""}`} title="Hoy">
      {/* Hero: today's calories dominate the screen, on purpose. */}
      <section className="surface-soft px-5 py-5">
        <HeroMetric
          eyebrow="Calorías de hoy"
          value={Math.round(totals.energy_kcal).toLocaleString("es-ES")}
          unit={`/ ${goal.kcal.toLocaleString("es-ES")} kcal`}
          support={
            remaining >= 0
              ? `Quedan ${formatKcal(remaining)}`
              : `${formatKcal(Math.abs(remaining))} por encima del objetivo`
          }
          ring={
            <RingProgress value={totals.energy_kcal} max={goal.kcal} size={76} strokeWidth={7}>
              <span className="text-metric text-base text-[var(--text-primary)]">{pct}%</span>
            </RingProgress>
          }
        />
      </section>

      {/* Macros: full-width bars, readable consumed/goal at a glance. */}
      <section className="flex flex-col gap-4">
        <MetricBar label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="var(--metric-protein)" />
        <MetricBar label="Carbohidratos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="var(--metric-carbs)" />
        <MetricBar label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="var(--metric-fat)" />
        {goal.fiber_g ? (
          <MetricBar label="Fibra" value={totals.fiber_g ?? 0} goal={goal.fiber_g} color="var(--metric-fiber)" />
        ) : null}
      </section>

      {/* Volumen: a quiet inline strip, not a card competing with the hero. */}
      {lastTrend ? (
        <section className="flex items-center gap-3 border-y border-[var(--border-soft)] py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--metric-weight-soft)" }}>
            <TrendIcon size={15} style={{ color: "var(--metric-weight)" }} />
          </span>
          <p className="text-xs text-[var(--text-secondary)]">Tendencia de peso</p>
          <p className="text-metric ml-auto text-sm text-[var(--text-primary)]">{formatKg(lastTrend.trendKg)}</p>
          {weeklyRate.weeklyRateKg != null ? (
            <p className="text-metric text-xs text-[var(--text-tertiary)]">
              {formatSignedKgPerWeek(weeklyRate.weeklyRateKg)}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Comidas: a timeline grouped by meal type, not a flat card stack. */}
      <section className="flex flex-col gap-3">
        <SectionHeader>Comidas de hoy</SectionHeader>
        {orderedGroups.length === 0 ? (
          <EmptyState
            title="Sin comidas registradas todavía"
            description="Usa el botón Registrar para añadir tu primera comida del día."
          />
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
