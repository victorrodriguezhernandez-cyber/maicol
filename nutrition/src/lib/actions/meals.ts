"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MEAL_ITEM_SOURCES, maxPrecisionForSource, type PrecisionLevel } from "@/lib/nutrition/types";

const itemSchema = z.object({
  foodId: z.string().uuid().nullable().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  quantityAmount: z.number().positive(),
  quantityUnit: z.string().min(1),
  gramsEquivalent: z.number().positive().nullable().optional(),
  energyKcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative().default(0),
  carbohydratesG: z.number().nonnegative().default(0),
  sugarsG: z.number().nonnegative().nullable().optional(),
  fatG: z.number().nonnegative().default(0),
  saturatedFatG: z.number().nonnegative().nullable().optional(),
  fiberG: z.number().nonnegative().nullable().optional(),
  sodiumMg: z.number().nonnegative().nullable().optional(),
  saltG: z.number().nonnegative().nullable().optional(),
  micronutrients: z.record(z.string(), z.number()).default({}),
  precisionLevel: z.enum(["exact", "calculated", "estimated", "unknown"]),
  source: z.enum(MEAL_ITEM_SOURCES),
  confidence: z.enum(["high", "medium", "low"]).nullable().optional(),
  rangeKcalMin: z.number().nonnegative().nullable().optional(),
  rangeKcalMax: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const createMealSchema = z.object({
  occurredAt: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
  name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;

/** Never lets a source claim more precision than it's actually entitled to
 * (section 2/37) — this is enforced server-side, not just trusted from the
 * client. */
function clampPrecision(
  source: CreateMealInput["items"][number]["source"],
  requested: PrecisionLevel,
): PrecisionLevel {
  const order: PrecisionLevel[] = ["unknown", "estimated", "calculated", "exact"];
  const maxAllowed = maxPrecisionForSource(source);
  return order.indexOf(requested) > order.indexOf(maxAllowed) ? maxAllowed : requested;
}

export async function createMeal(input: CreateMealInput) {
  const parsed = createMealSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      occurred_at: parsed.occurredAt,
      meal_type: parsed.mealType,
      name: parsed.name ?? null,
      notes: parsed.notes ?? null,
    })
    .select("id")
    .single();
  if (mealError) throw mealError;

  const rows = parsed.items.map((item, index) => ({
    meal_id: meal.id,
    food_id: item.foodId ?? null,
    recipe_id: item.recipeId ?? null,
    name: item.name,
    quantity_amount: item.quantityAmount,
    quantity_unit: item.quantityUnit,
    grams_equivalent: item.gramsEquivalent ?? null,
    energy_kcal: item.energyKcal,
    protein_g: item.proteinG,
    carbohydrates_g: item.carbohydratesG,
    sugars_g: item.sugarsG ?? null,
    fat_g: item.fatG,
    saturated_fat_g: item.saturatedFatG ?? null,
    fiber_g: item.fiberG ?? null,
    sodium_mg: item.sodiumMg ?? null,
    salt_g: item.saltG ?? null,
    micronutrients: item.micronutrients,
    precision_level: clampPrecision(item.source, item.precisionLevel),
    source: item.source,
    confidence: item.confidence ?? null,
    range_kcal_min: item.rangeKcalMin ?? null,
    range_kcal_max: item.rangeKcalMax ?? null,
    notes: item.notes ?? null,
    position: index,
  }));

  const { error: itemsError } = await supabase.from("meal_items").insert(rows);
  if (itemsError) throw itemsError;

  // Learn frequency/usual-quantity per food (section 20).
  await upsertFoodUsageStats(supabase, user.id, parsed.items);

  revalidatePath("/");
  revalidatePath("/diario");
  return meal.id as string;
}

async function upsertFoodUsageStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  items: CreateMealInput["items"],
) {
  for (const item of items) {
    if (!item.foodId) continue;
    const { data: existing } = await supabase
      .from("user_food_stats")
      .select("id, times_used")
      .eq("user_id", userId)
      .eq("food_id", item.foodId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_food_stats")
        .update({
          times_used: existing.times_used + 1,
          last_used_at: new Date().toISOString(),
          usual_quantity_amount: item.quantityAmount,
          usual_quantity_unit: item.quantityUnit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_food_stats").insert({
        user_id: userId,
        food_id: item.foodId,
        times_used: 1,
        last_used_at: new Date().toISOString(),
        usual_quantity_amount: item.quantityAmount,
        usual_quantity_unit: item.quantityUnit,
      });
    }
  }
}

export async function deleteMeal(mealId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meals").delete().eq("id", mealId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/diario");
}

export async function deleteMealItem(mealItemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_items").delete().eq("id", mealItemId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/diario");
}
