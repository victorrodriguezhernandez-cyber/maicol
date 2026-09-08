import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toLocalDateKey, todayLocalDateString } from "@/lib/format";

export interface DaySummary {
  date: string;
  totalKcal: number;
  status: "complete" | "partial" | "not_logged";
  weightKg: number | null;
}

/** Aggregates the last N calendar days into a per-day kcal/status summary
 * for the diary calendar view (section 40).
 *
 * The day range is anchored on todayLocalDateString() (Europe/Madrid) and
 * walked with the UTC-suffixed Date methods, not the local ones — those
 * are environment-dependent and on a UTC server would walk UTC calendar
 * days, one Madrid day out of step near either DST transition. Each
 * timestamp is then bucketed with toLocalDateKey(), not a raw ISO slice —
 * slicing gives the UTC calendar date, which misfiles anything logged
 * between local midnight and ~2am into the previous day. */
export async function getRecentDaysSummary(
  supabase: SupabaseClient,
  userId: string,
  days = 30,
): Promise<DaySummary[]> {
  const todayKey = todayLocalDateString();
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const sinceUtc = new Date(Date.UTC(ty, tm - 1, td));
  sinceUtc.setUTCDate(sinceUtc.getUTCDate() - (days - 1));
  // A one-day margin on the query itself so nothing right at the
  // Europe/Madrid midnight boundary gets clipped by this UTC instant
  // comparison — the bucketing below is what actually assigns each row
  // to the correct calendar day.
  const queryFromIso = new Date(sinceUtc.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: items, error: itemsError }, { data: dayLogs }, { data: weights }] = await Promise.all([
    supabase
      .from("meals")
      .select("occurred_at, meal_items(energy_kcal)")
      .eq("user_id", userId)
      .gte("occurred_at", queryFromIso),
    supabase
      .from("day_logs")
      .select("log_date, status")
      .eq("user_id", userId)
      .gte("log_date", toLocalDateKey(sinceUtc)),
    supabase
      .from("weight_entries")
      .select("measured_at, weight_kg")
      .eq("user_id", userId)
      .gte("measured_at", queryFromIso),
  ]);
  if (itemsError) throw itemsError;

  const kcalByDay = new Map<string, number>();
  for (const meal of items ?? []) {
    const day = toLocalDateKey(meal.occurred_at as string);
    const mealKcal = (meal.meal_items as { energy_kcal: number }[]).reduce(
      (a, b) => a + b.energy_kcal,
      0,
    );
    kcalByDay.set(day, (kcalByDay.get(day) ?? 0) + mealKcal);
  }

  const statusByDay = new Map((dayLogs ?? []).map((d) => [d.log_date as string, d.status as string]));
  const weightByDay = new Map<string, number>();
  for (const w of weights ?? []) {
    weightByDay.set(toLocalDateKey(w.measured_at as string), w.weight_kg as number);
  }

  const result: DaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(sinceUtc);
    d.setUTCDate(d.getUTCDate() + i);
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
