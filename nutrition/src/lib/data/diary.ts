import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DaySummary {
  date: string;
  totalKcal: number;
  status: "complete" | "partial" | "not_logged";
  weightKg: number | null;
}

/** Aggregates the last N calendar days into a per-day kcal/status summary
 * for the diary calendar view (section 40). */
export async function getRecentDaysSummary(
  supabase: SupabaseClient,
  userId: string,
  days = 30,
): Promise<DaySummary[]> {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const sinceIso = since.toISOString();

  const [{ data: items, error: itemsError }, { data: dayLogs }, { data: weights }] = await Promise.all([
    supabase
      .from("meals")
      .select("occurred_at, meal_items(energy_kcal)")
      .eq("user_id", userId)
      .gte("occurred_at", sinceIso),
    supabase.from("day_logs").select("log_date, status").eq("user_id", userId).gte("log_date", sinceIso.slice(0, 10)),
    supabase
      .from("weight_entries")
      .select("measured_at, weight_kg")
      .eq("user_id", userId)
      .gte("measured_at", sinceIso),
  ]);
  if (itemsError) throw itemsError;

  const kcalByDay = new Map<string, number>();
  for (const meal of items ?? []) {
    const day = (meal.occurred_at as string).slice(0, 10);
    const mealKcal = (meal.meal_items as { energy_kcal: number }[]).reduce(
      (a, b) => a + b.energy_kcal,
      0,
    );
    kcalByDay.set(day, (kcalByDay.get(day) ?? 0) + mealKcal);
  }

  const statusByDay = new Map((dayLogs ?? []).map((d) => [d.log_date as string, d.status as string]));
  const weightByDay = new Map<string, number>();
  for (const w of weights ?? []) {
    weightByDay.set((w.measured_at as string).slice(0, 10), w.weight_kg as number);
  }

  const result: DaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const totalKcal = kcalByDay.get(key) ?? 0;
    const explicitStatus = statusByDay.get(key) as DaySummary["status"] | undefined;
    result.push({
      date: key,
      totalKcal,
      status: explicitStatus ?? (totalKcal > 0 ? "partial" : "not_logged"),
      weightKg: weightByDay.get(key) ?? null,
    });
  }
  return result.reverse();
}
