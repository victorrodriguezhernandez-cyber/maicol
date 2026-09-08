import { addNutrients, scaleNutrients, ZERO_NUTRIENTS, type NutrientSet } from "./types";

export interface RecipeIngredient {
  gramsEquivalent: number;
  /** Nutrients per 100 g/ml for this ingredient (already normalized). */
  per100: NutrientSet;
}

export interface RecipeTotals {
  totalGrams: number;
  total: NutrientSet;
  /** Per-serving totals, given the recipe's declared `servings`. */
  perServing: NutrientSet;
}

/**
 * Aggregates a recipe's ingredients into total + per-serving nutrition.
 * Ingredient scaling and the summation both use full precision; only the
 * final numbers get rounded, at render time.
 */
export function computeRecipeTotals(
  ingredients: RecipeIngredient[],
  servings: number,
): RecipeTotals {
  let total = ZERO_NUTRIENTS;
  let totalGrams = 0;

  for (const ingredient of ingredients) {
    const factor = ingredient.gramsEquivalent / 100;
    total = addNutrients(total, scaleNutrients(ingredient.per100, factor));
    totalGrams += ingredient.gramsEquivalent;
  }

  const perServing = scaleNutrients(total, servings > 0 ? 1 / servings : 0);

  return { totalGrams, total, perServing };
}

export type RecipePortion =
  | { kind: "full" }
  | { kind: "servings"; servings: number }
  | { kind: "percentage"; percentage: number }
  | { kind: "grams"; grams: number };

/** Resolves how much of a recipe was actually eaten into a nutrient snapshot. */
export function resolveRecipePortion(
  totals: RecipeTotals,
  recipeServings: number,
  portion: RecipePortion,
): { grams: number; nutrients: NutrientSet } {
  switch (portion.kind) {
    case "full":
      return { grams: totals.totalGrams, nutrients: totals.total };
    case "servings":
      return {
        grams:
          totals.totalGrams > 0 && recipeServings > 0
            ? (totals.totalGrams / recipeServings) * portion.servings
            : 0,
        nutrients: scaleNutrients(totals.perServing, portion.servings),
      };
    case "percentage":
      return {
        grams: totals.totalGrams * (portion.percentage / 100),
        nutrients: scaleNutrients(totals.total, portion.percentage / 100),
      };
    case "grams": {
      const factor = totals.totalGrams > 0 ? portion.grams / totals.totalGrams : 0;
      return { grams: portion.grams, nutrients: scaleNutrients(totals.total, factor) };
    }
  }
}
