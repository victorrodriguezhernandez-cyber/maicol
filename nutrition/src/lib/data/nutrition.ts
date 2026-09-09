import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addNutrients, ZERO_NUTRIENTS, type NutrientSet } from "@/lib/nutrition/types";
import { localDayBoundsUtc } from "@/lib/format";
import type { MealItemRow, MealRow, NutritionGoalRow } from "@/lib/supabase/types";

/** The app layout (avatar initial) and the Hoy page (greeting name) both
 * need this for the same request — memoized so that's one query, not two. */
export const getProfileDisplayName = cache(
  async (supabase: SupabaseClient, userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return data?.display_name ?? null;
  },
);

export interface MealWithItems extends MealRow {
  meal_items: MealItemRow[];
  meal_images: { id: string; storage_path: string; thumbnail_path: string | null }[];
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
  const { start, end } = localDayBoundsUtc(date);
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

export interface DailyMacros {
  date: string;
  kcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
}

/** One row per calendar day in the window, zero-filled for days with no
 * logged meals — used by the adaptive-goal check and weekly summaries. */
export async function getDailyMacroSeries(
  supabase: SupabaseClient,
  userId: string,
  days: number,
): Promise<DailyMacros[]> {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const { data: meals, error } = await supabase
    .from("meals")
    .select("occurred_at, meal_items(energy_kcal, protein_g, carbohydrates_g, fat_g)")
    .eq("user_id", userId)
    .gte("occurred_at", since.toISOString());
  if (error) throw error;

  const byDay = new Map<string, DailyMacros>();
  for (const meal of meals ?? []) {
    const day = (meal.occurred_at as string).slice(0, 10);
    const acc = byDay.get(day) ?? { date: day, kcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0 };
    for (const item of meal.meal_items as Array<{
      energy_kcal: number;
      protein_g: number;
      carbohydrates_g: number;
      fat_g: number;
    }>) {
      acc.kcal += item.energy_kcal;
      acc.proteinG += item.protein_g;
      acc.carbohydratesG += item.carbohydrates_g;
      acc.fatG += item.fat_g;
    }
    byDay.set(day, acc);
  }

  const result: DailyMacros[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push(byDay.get(key) ?? { date: key, kcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0 });
  }
  return result;
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
