import { describe, expect, it } from "vitest";
import { suggestGoal } from "./goal-suggestion";

describe("suggestGoal", () => {
  it("suggests a surplus above maintenance for a gain goal", () => {
    const result = suggestGoal({
      weightKg: 80,
      heightCm: 180,
      age: 28,
      sex: "male",
      activityLevel: "moderate",
      mode: "gain",
      weeklyRateKgPerWeek: 0.25,
    });
    expect(result.kcal).toBeGreaterThan(result.maintenanceEstimateKcal);
  });

  it("suggests a deficit below maintenance for a lose goal", () => {
    const result = suggestGoal({
      weightKg: 80,
      heightCm: 180,
      age: 28,
      sex: "male",
      activityLevel: "moderate",
      mode: "lose",
      weeklyRateKgPerWeek: -0.5,
    });
    expect(result.kcal).toBeLessThan(result.maintenanceEstimateKcal);
  });

  it("macros roughly reconstruct total kcal (within rounding)", () => {
    const result = suggestGoal({
      weightKg: 75,
      heightCm: 175,
      age: 30,
      sex: "female",
      activityLevel: "light",
      mode: "maintain",
      weeklyRateKgPerWeek: 0,
    });
    const reconstructed =
      result.proteinG * 4 + result.fatG * 9 + result.carbohydratesG * 4;
    expect(Math.abs(reconstructed - result.kcal)).toBeLessThanOrEqual(4);
  });
});
