import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addNutrients, ZERO_NUTRIENTS, type NutrientSet } from "@/lib/nutrition/types";
import type { MealItemRow, MealRow, NutritionGoalRow } from "@/lib/supabase/types";

export interface MealWithItems extends MealRow {
  meal_items: MealItemRow[];
  meal_images: { id: string; storage_path: string; thumbnail_path: string | null }[];
}

/** UTC day bounds for a given local calendar date string (YYYY-MM-DD). */
function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getCurrentGoal(
  supabase: SupabaseClient,
  userId: string,
): Promise<NutritionGoalRow | null> {
  const { data, error } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", userId)
    .is("effective_to", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMealsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<MealWithItems[]> {
  const { start, end } = dayRange(date);
  const { data, error } = await supabase
    .from("meals")
    .select("*, meal_items(*), meal_images(id, storage_path, thumbnail_path)")
    .eq("user_id", userId)
    .gte("occurred_at", start)
    .lte("occurred_at", end)
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MealWithItems[];
}

export function sumMealItems(items: MealItemRow[]): NutrientSet {
  return items.reduce<NutrientSet>(
    (acc, item) =>
      addNutrients(acc, {
        energy_kcal: item.energy_kcal,
        protein_g: item.protein_g,
        carbohydrates_g: item.carbohydrates_g,
        sugars_g: item.sugars_g,
        fat_g: item.fat_g,
        saturated_fat_g: item.saturated_fat_g,
        fiber_g: item.fiber_g,
        sodium_mg: item.sodium_mg,
        salt_g: item.salt_g,
        micronutrients: (item.micronutrients ?? {}) as Record<string, number>,
      }),
    ZERO_NUTRIENTS,
  );
}

export function sumMeals(meals: MealWithItems[]): NutrientSet {
  return meals.reduce<NutrientSet>(
    (acc, meal) => addNutrients(acc, sumMealItems(meal.meal_items)),
    ZERO_NUTRIENTS,
  );
}

export async function getWeightEntriesSince(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string,
) {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, measured_at, weight_kg, is_usual_conditions, notes")
    .eq("user_id", userId)
    .gte("measured_at", sinceIso)
    .order("measured_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
