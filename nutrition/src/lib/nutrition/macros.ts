import type { NutrientSet } from "./types";

/**
 * Scales a food's per-basis nutrients to a consumed quantity.
 *
 * Fixture from section 63: a food that is 400 kcal per 100 g, consumed at
 * 75 g, MUST yield exactly 300 kcal — see nutrition/macros.test.ts.
 *
 * All math is done in full floating point precision; callers round only
 * when *displaying* a value (see units.ts#roundForDisplay), so scaling a
 * recipe and then a serving of that recipe never compounds rounding error.
 */
export function scaleFromPer100(
  per100: NutrientSet,
  gramsOrMl: number,
): NutrientSet {
  const factor = gramsOrMl / 100;
  return scale(per100, factor);
}

export function scaleFromServing(
  perServing: NutrientSet,
  servingSize: number,
  consumedAmount: number,
): NutrientSet {
  const factor = consumedAmount / servingSize;
  return scale(perServing, factor);
}

function scale(n: NutrientSet, factor: number): NutrientSet {
  const micronutrients: Record<string, number> = {};
  for (const [key, value] of Object.entries(n.micronutrients ?? {})) {
    micronutrients[key] = value * factor;
  }
  return {
    energy_kcal: n.energy_kcal * factor,
    protein_g: n.protein_g * factor,
    carbohydrates_g: n.carbohydrates_g * factor,
    sugars_g: n.sugars_g != null ? n.sugars_g * factor : n.sugars_g,
    fat_g: n.fat_g * factor,
    saturated_fat_g:
      n.saturated_fat_g != null ? n.saturated_fat_g * factor : n.saturated_fat_g,
    fiber_g: n.fiber_g != null ? n.fiber_g * factor : n.fiber_g,
    sodium_mg: n.sodium_mg != null ? n.sodium_mg * factor : n.sodium_mg,
    salt_g: n.salt_g != null ? n.salt_g * factor : n.salt_g,
    micronutrients,
  };
}

/** 4/4/9 Atwater estimate — used only as a sanity cross-check, never to
 * override a declared energy value (a real label can legitimately differ
 * a little from the Atwater estimate because of fiber/alcohol/rounding). */
export function estimateKcalFromMacros(n: {
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
}): number {
  return n.protein_g * 4 + n.carbohydrates_g * 4 + n.fat_g * 9;
}
