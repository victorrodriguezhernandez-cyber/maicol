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
