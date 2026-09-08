"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createFoodSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  source: z.enum(["nutrition_label", "custom_food"]),
  basis: z.enum(["per_100g", "per_100ml", "per_serving"]),
  servingSizeG: z.number().positive().nullable().optional(),
  servingLabel: z.string().nullable().optional(),
  energyKcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbohydratesG: z.number().nonnegative(),
  sugarsG: z.number().nonnegative().nullable().optional(),
  fatG: z.number().nonnegative(),
  saturatedFatG: z.number().nonnegative().nullable().optional(),
  fiberG: z.number().nonnegative().nullable().optional(),
  sodiumMg: z.number().nonnegative().nullable().optional(),
  saltG: z.number().nonnegative().nullable().optional(),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;

/** Saves a label-scanned or manually-defined food as the user's own
 * private catalog entry, so it's searchable next time (section 13/17). */
export async function createCustomFood(input: CreateFoodInput) {
  const parsed = createFoodSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name: parsed.name,
      brand: parsed.brand ?? null,
      source: parsed.source,
      basis: parsed.basis,
      serving_size_g: parsed.servingSizeG ?? null,
      serving_label: parsed.servingLabel ?? null,
      energy_kcal: parsed.energyKcal,
      protein_g: parsed.proteinG,
      carbohydrates_g: parsed.carbohydratesG,
      sugars_g: parsed.sugarsG ?? null,
      fat_g: parsed.fatG,
      saturated_fat_g: parsed.saturatedFatG ?? null,
      fiber_g: parsed.fiberG ?? null,
      sodium_mg: parsed.sodiumMg ?? null,
      salt_g: parsed.saltG ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
