import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGoal, getDailyMacroSeries, getWeightEntriesSince } from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import { checkAdaptiveGoal } from "@/lib/nutrition/adaptive-goal";
import { AdaptiveGoalCard } from "@/components/coach/AdaptiveGoalCard";
import { ChatCoach } from "@/components/coach/ChatCoach";

const ANALYSIS_WINDOW_DAYS = 14;

export default async function CoachIaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);

  let adaptiveCard = null;
  if (goal) {
    const since = new Date();
    since.setDate(since.getDate() - ANALYSIS_WINDOW_DAYS);
    const [macroDays, weightEntries] = await Promise.all([
      getDailyMacroSeries(supabase, user.id, ANALYSIS_WINDOW_DAYS),
      getWeightEntriesSince(supabase, user.id, since.toISOString()),
    ]);

    const reliableDays = macroDays.filter((d) => d.kcal > 0).length;
    const loggedKcal = macroDays.filter((d) => d.kcal > 0).map((d) => d.kcal);
    const avgLoggedKcalPerDay = loggedKcal.length
      ? loggedKcal.reduce((a, b) => a + b, 0) / loggedKcal.length
      : 0;

    const trendPoints = computeWeightTrend(
      weightEntries.map((w) => ({ measuredAt: w.measured_at, weightKg: w.weight_kg })),
    );
    const weeklyRate = computeWeeklyRate(trendPoints, { windowDays: ANALYSIS_WINDOW_DAYS });
    const trendWeightChangeKg =
      trendPoints.length >= 2 ? trendPoints.at(-1)!.trendKg - trendPoints[0].trendKg : 0;

    const suggestion = checkAdaptiveGoal({
      currentGoalKcal: goal.kcal,
      weeklyRateMinKg: goal.weekly_rate_min_kg,
      weeklyRateMaxKg: goal.weekly_rate_max_kg,
      actualWeeklyRateKg: weeklyRate.weeklyRateKg,
      avgLoggedKcalPerDay,
      trendWeightChangeKg,
      windowDays: ANALYSIS_WINDOW_DAYS,
      reliableDays,
      weighInDays: new Set(weightEntries.map((w) => w.measured_at.slice(0, 10))).size,
    });

    if (suggestion.hasSuggestion) {
      adaptiveCard = <AdaptiveGoalCard suggestion={suggestion} currentGoal={goal} />;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Coach IA</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Conoce tus datos reales de nutrición y peso.</p>
      </div>
      {adaptiveCard}
      <ChatCoach currentGoal={goal} />
    </div>
  );
}
