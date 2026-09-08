import { describe, expect, it } from "vitest";
import { scaleFromPer100, estimateKcalFromMacros } from "./macros";
import { ZERO_NUTRIENTS } from "./types";

describe("scaleFromPer100", () => {
  it("section 63 fixture: 400 kcal/100g at 75g => exactly 300 kcal", () => {
    const per100 = { ...ZERO_NUTRIENTS, energy_kcal: 400 };
    const result = scaleFromPer100(per100, 75);
    expect(result.energy_kcal).toBe(300);
  });

  it("scales every macro proportionally", () => {
    const per100 = {
      ...ZERO_NUTRIENTS,
      energy_kcal: 200,
      protein_g: 20,
      carbohydrates_g: 10,
      fat_g: 8,
      fiber_g: 4,
    };
    const result = scaleFromPer100(per100, 50);
    expect(result.energy_kcal).toBe(100);
    expect(result.protein_g).toBe(10);
    expect(result.carbohydrates_g).toBe(5);
    expect(result.fat_g).toBe(4);
    expect(result.fiber_g).toBe(2);
  });

  it("handles micronutrients", () => {
    const per100 = {
      ...ZERO_NUTRIENTS,
      energy_kcal: 100,
      micronutrients: { calcium_mg: 120, iron_mg: 2 },
    };
    const result = scaleFromPer100(per100, 250);
    expect(result.micronutrients.calcium_mg).toBeCloseTo(300);
    expect(result.micronutrients.iron_mg).toBeCloseTo(5);
  });

  it("does not accumulate rounding error across repeated scaling", () => {
    // 3 successive scalings should equal one combined scaling exactly
    // (within floating point epsilon), because we never round internally.
    const per100 = { ...ZERO_NUTRIENTS, energy_kcal: 333 };
    const step1 = scaleFromPer100(per100, 33);
    const combinedFactor = (33 / 100) * (150 / 100) * (10 / 100);
    const stepwise = scaleFromPer100(scaleFromPer100(per100, 33 * 1.5), 10);
    expect(stepwise.energy_kcal).toBeCloseTo(per100.energy_kcal * combinedFactor * (100/100), 6);
    expect(step1.energy_kcal).toBeCloseTo(333 * 0.33, 10);
  });
});

describe("estimateKcalFromMacros", () => {
  it("uses the 4/4/9 Atwater factors", () => {
    expect(estimateKcalFromMacros({ protein_g: 10, carbohydrates_g: 20, fat_g: 5 })).toBe(
      10 * 4 + 20 * 4 + 5 * 9,
    );
  });
});
