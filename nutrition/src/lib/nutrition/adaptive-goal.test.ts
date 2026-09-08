import { describe, expect, it } from "vitest";
import { checkAdaptiveGoal } from "./adaptive-goal";

describe("checkAdaptiveGoal", () => {
  it("suggests no change with insufficient data", () => {
    const result = checkAdaptiveGoal({
      currentGoalKcal: 2800,
      weeklyRateMinKg: 0.2,
      weeklyRateMaxKg: 0.3,
      actualWeeklyRateKg: 0.1,
      avgLoggedKcalPerDay: 2750,
      trendWeightChangeKg: 0.15,
      windowDays: 5,
      reliableDays: 3,
      weighInDays: 3,
    });
    expect(result.hasSuggestion).toBe(false);
    expect(result.confidence).toBe("insufficient_data");
  });

  it("proposes an increase when trending below the target range (section 27 example)", () => {
    const result = checkAdaptiveGoal({
      currentGoalKcal: 2750,
      weeklyRateMinKg: 0.2,
      weeklyRateMaxKg: 0.3,
      actualWeeklyRateKg: 0.09,
      avgLoggedKcalPerDay: 2750,
      trendWeightChangeKg: 0.18,
      windowDays: 14,
      reliableDays: 12,
      weighInDays: 6,
    });
    expect(result.hasSuggestion).toBe(true);
    expect(result.suggestedKcal!).toBeGreaterThan(2750);
  });

  it("does not suggest anything when already within the target range", () => {
    const result = checkAdaptiveGoal({
      currentGoalKcal: 2800,
      weeklyRateMinKg: 0.2,
      weeklyRateMaxKg: 0.3,
      actualWeeklyRateKg: 0.25,
      avgLoggedKcalPerDay: 2800,
      trendWeightChangeKg: 0.5,
      windowDays: 14,
      reliableDays: 12,
      weighInDays: 6,
    });
    expect(result.hasSuggestion).toBe(false);
  });

  it("proposes a decrease when trending above the target range", () => {
    const result = checkAdaptiveGoal({
      currentGoalKcal: 2900,
      weeklyRateMinKg: 0.2,
      weeklyRateMaxKg: 0.3,
      actualWeeklyRateKg: 0.5,
      avgLoggedKcalPerDay: 2900,
      trendWeightChangeKg: 1.0,
      windowDays: 14,
      reliableDays: 12,
      weighInDays: 6,
    });
    expect(result.hasSuggestion).toBe(true);
    expect(result.suggestedKcal!).toBeLessThan(2900);
  });
});
