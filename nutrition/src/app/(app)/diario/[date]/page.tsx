import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal, getMealsForDate, sumMealItems, sumMeals } from "@/lib/data/nutrition";
import { formatKcal, formatTime, MEAL_TYPE_LABELS } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { RingProgress } from "@/components/ui/RingProgress";
import { MealTypeIcon } from "@/components/ui/MealTypeIcon";
import { MacroChip } from "@/components/ui/MacroChip";
import { MacroInline } from "@/components/ui/MacroInline";
import { DayStatusPicker } from "@/components/dashboard/DayStatusPicker";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{date}</h1>
        <DayStatusPicker date={date} current={status} />
      </div>

      {goal ? (
        <>
          <section className="flex items-center justify-between gap-4">
            <p className="font-numeric text-[2rem] font-semibold leading-none text-[var(--text-primary)]">
              {Math.round(totals.energy_kcal)}{" "}
              <span className="text-sm font-normal text-[var(--text-secondary)]">/ {goal.kcal} kcal</span>
            </p>
            <RingProgress value={totals.energy_kcal} max={goal.kcal} size={52} strokeWidth={5} />
          </section>
          <section className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-[var(--border-soft)] pt-4">
            <MacroChip label="Proteína" value={totals.protein_g} goal={goal.protein_g} color="var(--metric-protein)" />
            <MacroChip label="Carbos" value={totals.carbohydrates_g} goal={goal.carbohydrates_g} color="var(--metric-carbs)" />
            <MacroChip label="Grasas" value={totals.fat_g} goal={goal.fat_g} color="var(--metric-fat)" />
          </section>
        </>
      ) : null}

      {meals.length === 0 ? (
        <EmptyState title="Sin comidas registradas este día" />
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
          {meals.map((meal) => {
            const mealTotals = sumMealItems(meal.meal_items);
            return (
              <li key={meal.id}>
                <Link href={`/diario/comida/${meal.id}`} className="flex flex-col gap-2 py-3 active:opacity-70">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      <MealTypeIcon type={meal.meal_type} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatTime(meal.occurred_at)} — {MEAL_TYPE_LABELS[meal.meal_type]}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {meal.meal_items.length} alimento{meal.meal_items.length === 1 ? "" : "s"}
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
    </div>
  );
}
