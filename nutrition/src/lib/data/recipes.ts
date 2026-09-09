import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeRecipeTotals, type RecipeIngredient } from "@/lib/nutrition/recipes";
import type { FoodRow } from "@/lib/supabase/types";

export interface RecipeRow {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeItemRow {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity_amount: number;
  quantity_unit: string;
  grams_equivalent: number;
  position: number;
  foods: FoodRow;
}

export async function listRecipes(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RecipeRow[];
}

export interface RecipeSummary extends RecipeRow {
  perServingKcal: number;
  ingredientCount: number;
}

/** Same list, plus a per-serving kcal figure and ingredient count for the
 * card grid — one extra query joining every recipe_items row the user
 * owns to its food (not one query per recipe), grouped in memory. */
export async function listRecipesWithSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecipeSummary[]> {
  const recipes = await listRecipes(supabase, userId);
  if (recipes.length === 0) return [];

  const { data: items, error } = await supabase
    .from("recipe_items")
    .select("recipe_id, grams_equivalent, foods(energy_kcal, basis, serving_size_g)")
    .in(
      "recipe_id",
      recipes.map((r) => r.id),
    );
  if (error) throw error;

  const byRecipe = new Map<string, { kcal: number; count: number }>();
  for (const item of (items ?? []) as unknown as Array<{
    recipe_id: string;
    grams_equivalent: number;
    foods: { energy_kcal: number; basis: string; serving_size_g: number | null };
  }>) {
    const food = item.foods;
    const isServingBasis = food.basis === "per_serving" && food.serving_size_g;
    const factor = isServingBasis ? 100 / food.serving_size_g! : 1;
    const kcalPer100 = food.energy_kcal * factor;
    const acc = byRecipe.get(item.recipe_id) ?? { kcal: 0, count: 0 };
    acc.kcal += (kcalPer100 * item.grams_equivalent) / 100;
    acc.count += 1;
    byRecipe.set(item.recipe_id, acc);
  }

  return recipes.map((r) => {
    const agg = byRecipe.get(r.id) ?? { kcal: 0, count: 0 };
    return {
      ...r,
      perServingKcal: r.servings > 0 ? agg.kcal / r.servings : agg.kcal,
      ingredientCount: agg.count,
    };
  });
}

export async function getRecipeWithItems(supabase: SupabaseClient, recipeId: string) {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();
  if (recipeError) throw recipeError;

  const { data: items, error: itemsError } = await supabase
    .from("recipe_items")
    .select("*, foods(*)")
    .eq("recipe_id", recipeId)
    .order("position", { ascending: true });
  if (itemsError) throw itemsError;

  const typedItems = (items ?? []) as unknown as RecipeItemRow[];
  const ingredients: RecipeIngredient[] = typedItems.map((item) => {
    const food = item.foods;
    const isServingBasis = food.basis === "per_serving" && food.serving_size_g;
    const factor = isServingBasis ? 100 / food.serving_size_g! : 1;
    return {
      gramsEquivalent: item.grams_equivalent,
      per100: {
        energy_kcal: food.energy_kcal * factor,
        protein_g: food.protein_g * factor,
        carbohydrates_g: food.carbohydrates_g * factor,
        sugars_g: food.sugars_g != null ? food.sugars_g * factor : null,
        fat_g: food.fat_g * factor,
        saturated_fat_g: food.saturated_fat_g != null ? food.saturated_fat_g * factor : null,
        fiber_g: food.fiber_g != null ? food.fiber_g * factor : null,
        sodium_mg: food.sodium_mg != null ? food.sodium_mg * factor : null,
        salt_g: food.salt_g != null ? food.salt_g * factor : null,
        micronutrients: {},
      },
    };
  });

  const totals = computeRecipeTotals(ingredients, (recipe as RecipeRow).servings);

  return { recipe: recipe as RecipeRow, items: typedItems, totals };
}
