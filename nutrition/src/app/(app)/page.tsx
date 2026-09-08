import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentGoal,
  getMealsForDate,
  getWeightEntriesSince,
  sumMealItems,
  sumMeals,
} from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import {
  formatKcal,
  formatGrams,
  formatKg,
  formatSignedKgPerWeek,
  formatTime,
  todayLocalDateString,
  MEAL_TYPE_LABELS,
} from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);
  if (!goal) redirect("/onboarding");

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
  const lastObserved = weightEntries.at(-1);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {Math.round(totals.energy_kcal)}{" "}
            <span className="text-sm font-normal text-[var(--text-secondary)]">
              / {goal.kcal} kcal
            </span>
          </p>
        </div>
        <div className="mt-2">
          <ProgressBar value={totals.energy_kcal} max={goal.kcal} />
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <MacroRow label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="#0F766E" />
          <MacroRow label="Carbohidratos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="#B45309" />
          <MacroRow label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="#7C3AED" />
          {goal.fiber_g ? (
            <MacroRow label="Fibra" value={totals.fiber_g ?? 0} goal={goal.fiber_g} color="#15803D" />
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Estado del volumen</p>
        {!lastTrend ? (
          <p className="mt-2 text-sm text-[var(--text-primary)]">
            Todavía no hay pesajes registrados.
          </p>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Tendencia</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {formatKg(lastTrend.trendKg)}
              </p>
              {lastObserved ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  Hoy: {formatKg(lastObserved.weight_kg)}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)]">Ritmo semanal</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {weeklyRate.weeklyRateKg != null
                  ? formatSignedKgPerWeek(weeklyRate.weeklyRateKg)
                  : "Sin datos suficientes"}
              </p>
              <StatusBadge status={weeklyRate.status} mode={goal.mode} />
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Diario de hoy</p>
        {meals.length === 0 ? (
          <EmptyState
            title="Sin comidas registradas todavía"
            description="Usa el botón Registrar para añadir tu primera comida del día."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {meals.map((meal) => {
              const mealTotals = sumMealItems(meal.meal_items);
              return (
                <li key={meal.id}>
                  <Link
                    href={`/diario/comida/${meal.id}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 active:bg-[var(--surface-2)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatTime(meal.occurred_at)} — {MEAL_TYPE_LABELS[meal.meal_type]}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {meal.meal_items.length} alimento
                        {meal.meal_items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatKcal(mealTotals.energy_kcal)}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatGrams(mealTotals.protein_g)} prot.
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MacroRow({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="tabular-nums text-[var(--text-primary)]">
          {formatGrams(value)} / {formatGrams(goal)}
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  );
}

function StatusBadge({
  status,
  mode,
}: {
  status: "insufficient_data" | "below_target" | "on_target" | "above_target";
  mode: string;
}) {
  if (mode === "maintain") return null;
  const labels: Record<typeof status, string> = {
    insufficient_data: "Datos insuficientes",
    below_target: "Por debajo del objetivo",
    on_target: "En objetivo",
    above_target: "Por encima del objetivo",
  };
  const colors: Record<typeof status, string> = {
    insufficient_data: "var(--text-secondary)",
    below_target: "var(--warning)",
    on_target: "var(--success)",
    above_target: "var(--warning)",
  };
  return (
    <p className="text-[11px] font-medium" style={{ color: colors[status] }}>
      {labels[status]}
    </p>
  );
}
