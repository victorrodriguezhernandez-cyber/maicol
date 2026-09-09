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
  formatKg,
  formatSignedKgPerWeek,
  formatTime,
  todayLocalDateString,
  localHour,
  MEAL_TYPE_LABELS,
} from "@/lib/format";
import { RingProgress } from "@/components/ui/RingProgress";
import { MealTypeIcon } from "@/components/ui/MealTypeIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { MacroChip } from "@/components/ui/MacroChip";
import { MacroInline } from "@/components/ui/MacroInline";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);
  if (!goal) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const firstName = profile?.display_name?.split(" ")[0] ?? null;
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
  const lastObserved = weightEntries.at(-1);
  const remaining = goal.kcal - totals.energy_kcal;

  return (
    <div className="relative flex flex-col gap-6">
      {/* A soft wash of the accent color behind the greeting/hero — not a
          decorative gradient hero, just enough atmosphere that the screen
          doesn't read as flat void behind flat text. Clipped to this page
          only (relative+overflow-hidden on the wrapper below it belongs to,
          not the shared layout), so it's Hoy's own signature, not global. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 left-1/2 h-56 w-full max-w-md -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent)",
        }}
      />

      <h1 className="relative text-xl font-semibold tracking-tight text-[var(--text-primary)]">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </h1>

      {/* Hero: today's calories dominate the screen — everything else is
          secondary, on purpose (section 3 of the design pass). */}
      <section className="relative flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Calorías de hoy
          </p>
          <div className="flex items-baseline gap-2.5">
            <span className="font-numeric text-[2.5rem] font-semibold leading-none text-[var(--text-primary)]">
              {Math.round(totals.energy_kcal)}
            </span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              / {goal.kcal} kcal
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {remaining >= 0
              ? `Quedan ${formatKcal(remaining)}`
              : `${formatKcal(Math.abs(remaining))} por encima del objetivo`}
          </p>
        </div>
        <RingProgress value={totals.energy_kcal} max={goal.kcal} size={64} strokeWidth={6}>
          <span className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
            {Math.round(Math.min(100, goal.kcal > 0 ? (totals.energy_kcal / goal.kcal) * 100 : 0))}%
          </span>
        </RingProgress>
      </section>

      {/* Macros: compact chips instead of four equal full-width bars. */}
      <section className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-[var(--border-soft)] pt-4">
        <MacroChip label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="var(--metric-protein)" />
        <MacroChip label="Carbos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="var(--metric-carbs)" />
        <MacroChip label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="var(--metric-fat)" />
        {goal.fiber_g ? (
          <MacroChip label="Fibra" value={totals.fiber_g ?? 0} goal={goal.fiber_g} color="var(--metric-fiber)" />
        ) : null}
      </section>

      {/* Volumen: its own soft surface (not a bordered card) so it reads as
          a distinct concept from the macro chips above it. */}
      <section className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3.5">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Volumen</p>
        {!lastTrend ? (
          <p className="text-sm text-[var(--text-primary)]">Sin pesajes todavía</p>
        ) : (
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">Tendencia</p>
              <p className="font-numeric text-sm font-semibold" style={{ color: "var(--metric-weight)" }}>
                {formatKg(lastTrend.trendKg)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">Ritmo/sem.</p>
              <p className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
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
                    className="flex flex-col gap-2 py-3 active:opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                        <MealTypeIcon type={meal.meal_type} />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {formatTime(meal.occurred_at)} — {MEAL_TYPE_LABELS[meal.meal_type]}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {meal.meal_items.length} alimento
                          {meal.meal_items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
                        {formatKcal(mealTotals.energy_kcal)}
                      </p>
                    </div>
                    <MacroInline
                      className="pl-12"
                      protein={mealTotals.protein_g}
                      carbs={mealTotals.carbohydrates_g}
                      fat={mealTotals.fat_g}
                    />
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
