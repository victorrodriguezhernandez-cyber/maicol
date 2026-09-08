"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const recipeItemSchema = z.object({
  foodId: z.string().uuid(),
  quantityAmount: z.number().positive(),
  quantityUnit: z.string().min(1),
  gramsEquivalent: z.number().positive(),
});

const createRecipeSchema = z.object({
  name: z.string().min(1),
  servings: z.number().positive(),
  instructions: z.string().nullable().optional(),
  items: z.array(recipeItemSchema).min(1),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export async function createRecipe(input: CreateRecipeInput) {
  const parsed = createRecipeSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      name: parsed.name,
      servings: parsed.servings,
      instructions: parsed.instructions ?? null,
    })
    .select("id")
    .single();
  if (recipeError) throw recipeError;

  const rows = parsed.items.map((item, index) => ({
    recipe_id: recipe.id,
    food_id: item.foodId,
    quantity_amount: item.quantityAmount,
    quantity_unit: item.quantityUnit,
    grams_equivalent: item.gramsEquivalent,
    position: index,
  }));
  const { error: itemsError } = await supabase.from("recipe_items").insert(rows);
  if (itemsError) throw itemsError;

  revalidatePath("/recetas");
  return recipe.id as string;
}

export async function deleteRecipe(recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) throw error;
  revalidatePath("/recetas");
}
