import { describe, expect, it } from "vitest";
import { computeRecipeTotals, resolveRecipePortion } from "./recipes";
import { ZERO_NUTRIENTS } from "./types";

describe("computeRecipeTotals — 'Batido volumen' fixture (section 19)", () => {
  // 400 ml milk (~64 kcal/100ml, 3.4g protein/100ml)
  // 80 g oats (389 kcal/100g, 16.9g protein/100g)
  // 30 g whey protein (380 kcal/100g, 80g protein/100g)
  // 118 g banana (89 kcal/100g, 1.1g protein/100g)
  // 20 g peanut butter (588 kcal/100g, 25g protein/100g)
  const ingredients = [
    { gramsEquivalent: 400, per100: { ...ZERO_NUTRIENTS, energy_kcal: 64, protein_g: 3.4 } },
    { gramsEquivalent: 80, per100: { ...ZERO_NUTRIENTS, energy_kcal: 389, protein_g: 16.9 } },
    { gramsEquivalent: 30, per100: { ...ZERO_NUTRIENTS, energy_kcal: 380, protein_g: 80 } },
    { gramsEquivalent: 118, per100: { ...ZERO_NUTRIENTS, energy_kcal: 89, protein_g: 1.1 } },
    { gramsEquivalent: 20, per100: { ...ZERO_NUTRIENTS, energy_kcal: 588, protein_g: 25 } },
  ];

  it("sums total grams and nutrients", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    expect(totals.totalGrams).toBe(400 + 80 + 30 + 118 + 20);
    const expectedKcal =
      64 * 4 + 389 * 0.8 + 380 * 0.3 + 89 * 1.18 + 588 * 0.2;
    expect(totals.total.energy_kcal).toBeCloseTo(expectedKcal, 6);
  });

  it("divides evenly per serving", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    expect(totals.perServing.energy_kcal).toBeCloseTo(totals.total.energy_kcal / 2, 10);
    expect(totals.perServing.protein_g).toBeCloseTo(totals.total.protein_g / 2, 10);
  });

  it("resolves 'full recipe' portion to the full totals", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    const portion = resolveRecipePortion(totals, 2, { kind: "full" });
    expect(portion.grams).toBe(totals.totalGrams);
    expect(portion.nutrients.energy_kcal).toBeCloseTo(totals.total.energy_kcal, 10);
  });

  it("resolves 'half the recipe' (1 serving of 2) to exactly half", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    const portion = resolveRecipePortion(totals, 2, { kind: "servings", servings: 1 });
    expect(portion.nutrients.energy_kcal).toBeCloseTo(totals.total.energy_kcal / 2, 10);
  });

  it("resolves a percentage portion", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    const portion = resolveRecipePortion(totals, 2, { kind: "percentage", percentage: 25 });
    expect(portion.nutrients.energy_kcal).toBeCloseTo(totals.total.energy_kcal * 0.25, 10);
    expect(portion.grams).toBeCloseTo(totals.totalGrams * 0.25, 10);
  });

  it("resolves a grams-of-finished-recipe portion", () => {
    const totals = computeRecipeTotals(ingredients, 2);
    const portion = resolveRecipePortion(totals, 2, { kind: "grams", grams: 100 });
    const expectedFactor = 100 / totals.totalGrams;
    expect(portion.nutrients.energy_kcal).toBeCloseTo(totals.total.energy_kcal * expectedFactor, 10);
  });
});
