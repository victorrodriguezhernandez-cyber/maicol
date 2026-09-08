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
  const remaining = goal.kcal - totals.energy_kcal;

  return (
    <div className="flex flex-col gap-7">
      {/* Hero: today's calories dominate the screen — everything else is
          secondary, on purpose (section 3 of the design pass). */}
      <section className="flex flex-col gap-3 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          Calorías de hoy
        </p>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[3.25rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--text-primary)]">
            {Math.round(totals.energy_kcal)}
          </span>
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            / {goal.kcal} kcal
          </span>
        </div>
        <ProgressBar value={totals.energy_kcal} max={goal.kcal} />
        <p className="text-xs text-[var(--text-tertiary)]">
          {remaining >= 0
            ? `Quedan ${formatKcal(remaining)}`
            : `${formatKcal(Math.abs(remaining))} por encima del objetivo`}
        </p>
      </section>

      {/* Macros: compact chips instead of four equal full-width bars. */}
      <section className="grid grid-cols-3 gap-x-4 gap-y-4 border-t border-[var(--border-soft)] pt-5">
        <MacroChip label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="var(--metric-protein)" />
        <MacroChip label="Carbos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="var(--metric-carbs)" />
        <MacroChip label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="var(--metric-fat)" />
        {goal.fiber_g ? (
          <MacroChip label="Fibra" value={totals.fiber_g ?? 0} goal={goal.fiber_g} color="var(--metric-fiber)" />
        ) : null}
      </section>

      {/* Volumen: its own soft surface (not a bordered card) so it reads as
          a distinct concept from the macro chips above it. */}
      <section className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-4 py-3.5">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Volumen</p>
        {!lastTrend ? (
          <p className="text-sm text-[var(--text-primary)]">Sin pesajes todavía</p>
        ) : (
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">Tendencia</p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--metric-weight)" }}>
                {formatKg(lastTrend.trendKg)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">Ritmo/sem.</p>
              <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {weeklyRate.weeklyRateKg != null ? formatSignedKgPerWeek(weeklyRate.weeklyRateKg) : "—"}
              </p>
            </div>
            <StatusBadge status={weeklyRate.status} mode={goal.mode} />
          </div>
        )}
      </section>

      {/* Diario: a light list of rows, not a stack of identical cards. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Diario de hoy
          </p>
          {lastObserved ? (
            <p className="text-[11px] text-[var(--text-tertiary)]">Hoy: {formatKg(lastObserved.weight_kg)}</p>
          ) : null}
        </div>
        {meals.length === 0 ? (
          <EmptyState
            title="Sin comidas registradas todavía"
            description="Usa el botón Registrar para añadir tu primera comida del día."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
            {meals.map((meal) => {
              const mealTotals = sumMealItems(meal.meal_items);
              return (
                <li key={meal.id}>
                  <Link
                    href={`/diario/comida/${meal.id}`}
                    className="flex items-center justify-between py-3 active:opacity-70"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatTime(meal.occurred_at)} — {MEAL_TYPE_LABELS[meal.meal_type]}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {meal.meal_items.length} alimento
                        {meal.meal_items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatKcal(mealTotals.energy_kcal)}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
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

function MacroChip({
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">
        {formatGrams(value)}
        <span className="text-xs font-normal text-[var(--text-tertiary)]"> /{formatGrams(goal)}</span>
      </p>
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
    insufficient_data: "Sin datos",
    below_target: "Por debajo",
    on_target: "En objetivo",
    above_target: "Por encima",
  };
  const colors: Record<typeof status, string> = {
    insufficient_data: "var(--text-tertiary)",
    below_target: "var(--warning)",
    on_target: "var(--success)",
    above_target: "var(--warning)",
  };
  return (
    <p
      className="rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ color: colors[status], backgroundColor: "var(--surface)" }}
    >
      {labels[status]}
    </p>
  );
}
