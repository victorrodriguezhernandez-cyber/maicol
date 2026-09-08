import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverConfig } from "@/lib/config";
import type { FoodRow, FoodSource, NutrientBasis } from "@/lib/supabase/types";

export interface NewFoodInput {
  name: string;
  brand?: string | null;
  source: FoodSource;
  barcode?: string | null;
  externalId?: string | null;
  basis: NutrientBasis;
  servingSizeG?: number | null;
  servingSizeMl?: number | null;
  servingLabel?: string | null;
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  sugarsG?: number | null;
  fatG: number;
  saturatedFatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  saltG?: number | null;
}

/**
 * Caches a food coming from an external source (Open Food Facts, a label
 * scan, USDA) into the `foods` catalog.
 *
 * Prefers writing a *global* row (user_id null) via the service-role
 * client so every user benefits from the lookup — but if
 * SUPABASE_SERVICE_ROLE_KEY isn't configured (e.g. this hasn't been set up
 * yet), it degrades gracefully to a private row owned by the requesting
 * user, so barcode/label capture still works standalone.
 */
export async function cacheExternalFood(
  userScopedClient: SupabaseClient,
  userId: string,
  input: NewFoodInput,
): Promise<FoodRow> {
  const row = {
    name: input.name,
    brand: input.brand ?? null,
    source: input.source,
    barcode: input.barcode ?? null,
    external_id: input.externalId ?? null,
    basis: input.basis,
    serving_size_g: input.servingSizeG ?? null,
    serving_size_ml: input.servingSizeMl ?? null,
    serving_label: input.servingLabel ?? null,
    energy_kcal: input.energyKcal,
    protein_g: input.proteinG,
    carbohydrates_g: input.carbohydratesG,
    sugars_g: input.sugarsG ?? null,
    fat_g: input.fatG,
    saturated_fat_g: input.saturatedFatG ?? null,
    fiber_g: input.fiberG ?? null,
    sodium_mg: input.sodiumMg ?? null,
    salt_g: input.saltG ?? null,
    verified: false,
  };

  if (serverConfig.supabaseServiceRoleKey) {
    const admin = createAdminClient();
    if (input.barcode) {
      const { data: existing } = await admin
        .from("foods")
        .select("*")
        .is("user_id", null)
        .eq("barcode", input.barcode)
        .maybeSingle();
      if (existing) return existing as FoodRow;
    }
    const { data, error } = await admin.from("foods").insert({ ...row, user_id: null }).select("*").single();
    if (!error) return data as FoodRow;
    // Falls through to the per-user path if the global insert failed for
    // any reason other than a plain duplicate we should have caught above.
  }

  const { data, error } = await userScopedClient
    .from("foods")
    .insert({ ...row, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as FoodRow;
}
