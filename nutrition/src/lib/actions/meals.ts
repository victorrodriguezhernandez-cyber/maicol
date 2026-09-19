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

const addMealItemForDateSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
  item: itemSchema,
});
export type AddMealItemForDateInput = z.infer<typeof addMealItemForDateSchema>;

/**
 * Used by the Coach IA's "add_meal_item" action (never called directly from
 * a form): finds the first meal of the given type on that date, or creates
 * one at noon if none exists yet, then appends this single item. Returns
 * enough to undo it (which meal it landed in, and whether that meal is new
 * — undoing a brand-new meal means deleting the whole meal, undoing an
 * item added to an existing meal means deleting just that item).
 */
export async function addMealItemForDate(input: AddMealItemForDateInput) {
  const parsed = addMealItemForDateSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const dayStart = `${parsed.date}T00:00:00`;
  const dayEnd = `${parsed.date}T23:59:59.999`;

  const { data: existingMeal } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", user.id)
    .eq("meal_type", parsed.mealType)
    .gte("occurred_at", dayStart)
    .lte("occurred_at", dayEnd)
    .order("occurred_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let mealId: string;
  let mealCreated = false;
  if (existingMeal) {
    mealId = existingMeal.id as string;
  } else {
    const { data: meal, error } = await supabase
      .from("meals")
      .insert({ user_id: user.id, occurred_at: `${parsed.date}T12:00:00`, meal_type: parsed.mealType })
      .select("id")
      .single();
    if (error) throw error;
    mealId = meal.id as string;
    mealCreated = true;
  }

  const { count: existingItemCount } = await supabase
    .from("meal_items")
    .select("id", { count: "exact", head: true })
    .eq("meal_id", mealId);

  const item = parsed.item;
  const { data: insertedItem, error: itemError } = await supabase
    .from("meal_items")
    .insert({
      meal_id: mealId,
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
      position: existingItemCount ?? 0,
    })
    .select("id")
    .single();
  if (itemError) throw itemError;

  await upsertFoodUsageStats(supabase, user.id, [item]);

  revalidatePath("/");
  revalidatePath("/diario");
  return { mealId, mealItemId: insertedItem.id as string, mealCreated };
}

export async function deleteMeal(mealId: string) {
  const parsedId = z.string().uuid().parse(mealId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("meals").delete().eq("id", parsedId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/diario");
}

export async function deleteMealItem(mealItemId: string) {
  const parsedId = z.string().uuid().parse(mealItemId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("meal_items").delete().eq("id", parsedId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/diario");
}

const updateMealTypeSchema = z.object({
  mealId: z.string().uuid(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
});

export type ResultadoCambioDeTipo = { ok: true } | { ok: false; motivo: string };

/**
 * Mueve una comida ya guardada a otro momento del día.
 *
 * Hacía falta porque no había ninguna forma de corregirlo desde la app:
 * si la cena entraba como comida —el tipo se adivina por la hora— la
 * única salida era pedírselo al coach o borrarla y volver a dictarla.
 * Cambiar una etiqueta no debería costar una llamada a la IA.
 *
 * Sólo toca `meal_type`. La hora (`occurred_at`) se queda como estaba a
 * propósito: es el dato de cuándo comiste de verdad, y moverla para que
 * "cuadre" con la etiqueta nueva sería falsear un registro para que
 * encaje con su corrección.
 *
 * Devuelve el fallo como valor en vez de lanzarlo: en producción React
 * sustituye el mensaje de una excepción por un identificador opaco, así
 * que un `throw` aquí llegaría a la pantalla como "algo ha ido mal".
 */
export async function updateMealType(
  input: z.input<typeof updateMealTypeSchema>,
): Promise<ResultadoCambioDeTipo> {
  const parsed = updateMealTypeSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, motivo: "No has iniciado sesión." };

  // RLS ya lo impediría, pero comprobarlo aquí da un mensaje que se
  // entiende en vez de un error de base de datos.
  const { data: meal } = await supabase
    .from("meals")
    .select("id, user_id")
    .eq("id", parsed.mealId)
    .maybeSingle();
  if (!meal) return { ok: false, motivo: "Esa comida ya no existe." };
  if (meal.user_id !== user.id) return { ok: false, motivo: "Esa comida no es tuya." };

  const { error } = await supabase
    .from("meals")
    .update({ meal_type: parsed.mealType })
    .eq("id", parsed.mealId);
  if (error) return { ok: false, motivo: "No se ha podido cambiar. Inténtalo otra vez." };

  revalidatePath("/");
  revalidatePath("/diario");
  revalidatePath(`/diario/comida/${parsed.mealId}`);
  return { ok: true };
}
