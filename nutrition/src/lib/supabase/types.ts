/**
 * Hand-written row types for the tables this app talks to directly.
 *
 * These are intentionally hand-maintained rather than generated, so they
 * stay readable; if the schema drifts, `npm run db:types` (see
 * package.json) regenerates the exhaustive version from the live project
 * via the Supabase CLI/MCP and this file can be diffed against it.
 */

export type PrecisionLevel = "exact" | "calculated" | "estimated" | "unknown";

export type FoodSource =
  | "nutrition_label"
  | "open_food_facts"
  | "usda"
  | "custom_food"
  | "recipe"
  | "ai_photo_estimation"
  | "ai_text_estimation";

export type MealItemSource = FoodSource | "ai_voice_estimation" | "manual";

export type Confidence = "high" | "medium" | "low";

export type NutrientBasis = "per_100g" | "per_100ml" | "per_serving";

export interface Micronutrients {
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  magnesium_mg?: number;
  zinc_mg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  [key: string]: number | undefined;
}

export interface FoodRow {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  source: FoodSource;
  barcode: string | null;
  external_id: string | null;
  basis: NutrientBasis;
  serving_size_g: number | null;
  serving_size_ml: number | null;
  serving_label: string | null;
  energy_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  sugars_g: number | null;
  fat_g: number;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  micronutrients: Micronutrients;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealRow {
  id: string;
  user_id: string;
  occurred_at: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealItemRow {
  id: string;
  meal_id: string;
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  quantity_amount: number;
  quantity_unit: string;
  grams_equivalent: number | null;
  energy_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  sugars_g: number | null;
  fat_g: number;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  micronutrients: Micronutrients;
  precision_level: PrecisionLevel;
  source: MealItemSource;
  confidence: Confidence | null;
  range_kcal_min: number | null;
  range_kcal_max: number | null;
  notes: string | null;
  position: number;
  created_at: string;
}

export interface WeightEntryRow {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number;
  is_usual_conditions: boolean;
  notes: string | null;
  created_at: string;
}

export interface NutritionGoalRow {
  id: string;
  user_id: string;
  mode: "maintain" | "lose" | "gain";
  kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  water_ml: number | null;
  weight_target_kg: number | null;
  weekly_rate_min_kg: number | null;
  weekly_rate_max_kg: number | null;
  target_date: string | null;
  source: "manual" | "onboarding" | "ai_suggestion";
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}
