import { describe, expect, it } from "vitest";
import { estimateInitialMaintenance, computeAdaptiveMaintenance } from "./tdee";

describe("estimateInitialMaintenance", () => {
  it("matches the Mifflin-St Jeor formula for a male", () => {
    const result = estimateInitialMaintenance({
      weightKg: 80,
      heightCm: 180,
      age: 28,
      sex: "male",
      activityLevel: "moderate",
    });
    const bmr = 10 * 80 + 6.25 * 180 - 5 * 28 + 5;
    expect(result).toBeCloseTo(bmr * 1.55, 6);
  });

  it("matches the Mifflin-St Jeor formula for a female", () => {
    const result = estimateInitialMaintenance({
      weightKg: 65,
      heightCm: 165,
      age: 30,
      sex: "female",
      activityLevel: "sedentary",
    });
    const bmr = 10 * 65 + 6.25 * 165 - 5 * 30 - 161;
    expect(result).toBeCloseTo(bmr * 1.2, 6);
  });
});

describe("computeAdaptiveMaintenance", () => {
  it("returns insufficient_data with too little history", () => {
    const result = computeAdaptiveMaintenance({
      avgLoggedKcalPerDay: 2800,
      trendWeightChangeKg: 0.3,
      windowDays: 5,
      reliableDays: 3,
      weighInDays: 3,
    });
    expect(result.confidence).toBe("insufficient_data");
    expect(result.maintenanceKcal).toBeNull();
  });

  it("derives maintenance from logged intake minus the implied surplus", () => {
    // 14 days, +0.5kg trend change, avg logged 2900 kcal/day
    const result = computeAdaptiveMaintenance({
      avgLoggedKcalPerDay: 2900,
      trendWeightChangeKg: 0.5,
      windowDays: 14,
      reliableDays: 12,
      weighInDays: 6,
    });
    const impliedSurplus = (0.5 * 7700) / 14;
    expect(result.maintenanceKcal).toBeCloseTo(2900 - impliedSurplus, 6);
    expect(result.confidence).toBe("medium");
  });

  it("upgrades confidence to high with a longer, more complete window", () => {
    const result = computeAdaptiveMaintenance({
      avgLoggedKcalPerDay: 2900,
      trendWeightChangeKg: 0.6,
      windowDays: 28,
      reliableDays: 26,
      weighInDays: 20,
    });
    expect(result.confidence).toBe("high");
  });
});
