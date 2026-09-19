import { z } from "zod";

/**
 * The normalized nutrient snapshot shared by `foods` (per basis) and
 * `meal_items` (for the consumed quantity). Only the macro fields are
 * required — section 18 explicitly says not every food needs every
 * micronutrient.
 */
export const nutrientSetSchema = z.object({
  energy_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative().default(0),
  carbohydrates_g: z.number().nonnegative().default(0),
  sugars_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().default(0),
  saturated_fat_g: z.number().nonnegative().nullable().optional(),
  fiber_g: z.number().nonnegative().nullable().optional(),
  sodium_mg: z.number().nonnegative().nullable().optional(),
  salt_g: z.number().nonnegative().nullable().optional(),
  micronutrients: z.record(z.string(), z.number()).default({}),
});

export type NutrientSet = z.infer<typeof nutrientSetSchema>;

export const ZERO_NUTRIENTS: NutrientSet = {
  energy_kcal: 0,
  protein_g: 0,
  carbohydrates_g: 0,
  sugars_g: 0,
  fat_g: 0,
  saturated_fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
  salt_g: 0,
  micronutrients: {},
};

export function addNutrients(a: NutrientSet, b: NutrientSet): NutrientSet {
  const micronutrients: Record<string, number> = { ...a.micronutrients };
  for (const [key, value] of Object.entries(b.micronutrients ?? {})) {
    micronutrients[key] = (micronutrients[key] ?? 0) + value;
  }
  return {
    energy_kcal: a.energy_kcal + b.energy_kcal,
    protein_g: a.protein_g + b.protein_g,
    carbohydrates_g: a.carbohydrates_g + b.carbohydrates_g,
    sugars_g: (a.sugars_g ?? 0) + (b.sugars_g ?? 0),
    fat_g: a.fat_g + b.fat_g,
    saturated_fat_g: (a.saturated_fat_g ?? 0) + (b.saturated_fat_g ?? 0),
    fiber_g: (a.fiber_g ?? 0) + (b.fiber_g ?? 0),
    sodium_mg: (a.sodium_mg ?? 0) + (b.sodium_mg ?? 0),
    salt_g: (a.salt_g ?? 0) + (b.salt_g ?? 0),
    micronutrients,
  };
}

export function scaleNutrients(n: NutrientSet, factor: number): NutrientSet {
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

export const PRECISION_LEVELS = [
  "exact",
  "calculated",
  "estimated",
  "unknown",
] as const;
export type PrecisionLevel = (typeof PRECISION_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Provenance hierarchy from section 2, most trustworthy first. AI code
 * must never claim a higher source than what actually produced the
 * number — this ordering exists so UI can sort/badge consistently.
 */
export const FOOD_SOURCES = [
  "nutrition_label",
  "open_food_facts",
  "usda",
  "custom_food",
  "recipe",
  "ai_photo_estimation",
  "ai_text_estimation",
] as const;

export const MEAL_ITEM_SOURCES = [
  ...FOOD_SOURCES,
  "ai_voice_estimation",
  "manual",
] as const;
export type MealItemSource = (typeof MEAL_ITEM_SOURCES)[number];

/** Maps a source to the precision level it is allowed to claim at most. */
export function maxPrecisionForSource(source: MealItemSource): PrecisionLevel {
  switch (source) {
    case "nutrition_label":
    case "usda":
    case "open_food_facts":
    case "manual":
      return "exact";
    case "custom_food":
    case "recipe":
      return "calculated";
    case "ai_photo_estimation":
    case "ai_text_estimation":
    case "ai_voice_estimation":
      return "estimated";
    default:
      return "unknown";
  }
}
