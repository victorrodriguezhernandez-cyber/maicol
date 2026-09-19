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

const alimentoExternoSchema = z.object({
  fuente: z.enum(["open_food_facts", "usda"]),
  idExterno: z.string().min(1).max(64),
  codigoBarras: z.string().max(32).nullable(),
  nombre: z.string().min(1).max(200),
  marca: z.string().max(120).nullable(),
  basis: z.enum(["per_100g", "per_100ml"]),
  servingSizeG: z.number().positive().max(10_000).nullable(),
  servingLabel: z.string().max(120).nullable(),
  // Los topes son por 100 g, así que cualquier cosa por encima es un
  // dato roto en origen y no entra: 100 g no pueden tener 2.000 kcal
  // (la grasa pura, lo más denso que se come, ronda las 900).
  energyKcal: z.number().nonnegative().max(2000),
  proteinG: z.number().nonnegative().max(100),
  carbohydratesG: z.number().nonnegative().max(100),
  sugarsG: z.number().nonnegative().max(100).nullable(),
  fatG: z.number().nonnegative().max(100),
  saturatedFatG: z.number().nonnegative().max(100).nullable(),
  fiberG: z.number().nonnegative().max(100).nullable(),
  sodiumMg: z.number().nonnegative().max(100_000).nullable(),
  saltG: z.number().nonnegative().max(100).nullable(),
  micronutrients: z.record(z.string().max(40), z.number().nonnegative().max(1_000_000)),
});
export type AlimentoExternoInput = z.infer<typeof alimentoExternoSchema>;

/**
 * Guarda en tu catálogo un alimento que vino de una fuente externa.
 *
 * ── Por qué se guarda en vez de usarse y tirarse ───────────────────────
 *
 * La primera vez cuesta una llamada a Open Food Facts o a USDA. A partir
 * de ahí el alimento es tuyo: sale instantáneo, funciona sin cobertura,
 * entra en tus recientes y en favoritos, y cuenta para las estadísticas
 * de uso que ordenan el buscador. Es también lo que hace que la app no
 * dependa de que un servicio gratuito siga en pie dentro de dos años.
 *
 * Si ya lo habías guardado antes no se duplica: se busca por fuente +
 * id externo y se devuelve el que ya tenías.
 *
 * `source` se guarda de verdad ('open_food_facts' / 'usda') y no como
 * 'custom_food', porque de ahí sale la precisión que el alimento puede
 * declarar (`maxPrecisionForSource`, regla 1) y la trazabilidad de de
 * dónde salió cada número.
 */
export async function guardarAlimentoExterno(input: AlimentoExternoInput) {
  const parsed = alimentoExternoSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: yaGuardado } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", parsed.fuente)
    .eq("external_id", parsed.idExterno)
    .maybeSingle();
  if (yaGuardado) return yaGuardado;

  const { data, error } = await supabase
    .from("foods")
    .insert({
      user_id: user.id,
      name: parsed.nombre,
      brand: parsed.marca,
      source: parsed.fuente,
      barcode: parsed.codigoBarras,
      external_id: parsed.idExterno,
      basis: parsed.basis,
      serving_size_g: parsed.servingSizeG,
      serving_label: parsed.servingLabel,
      energy_kcal: parsed.energyKcal,
      protein_g: parsed.proteinG,
      carbohydrates_g: parsed.carbohydratesG,
      sugars_g: parsed.sugarsG,
      fat_g: parsed.fatG,
      saturated_fat_g: parsed.saturatedFatG,
      fiber_g: parsed.fiberG,
      sodium_mg: parsed.sodiumMg,
      salt_g: parsed.saltG,
      micronutrients: parsed.micronutrients,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
