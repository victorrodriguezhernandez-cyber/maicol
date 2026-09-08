"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const changeGoalSchema = z.object({
  mode: z.enum(["maintain", "lose", "gain"]).optional(),
  kcal: z.coerce.number().positive(),
  proteinG: z.coerce.number().nonnegative(),
  carbohydratesG: z.coerce.number().nonnegative(),
  fatG: z.coerce.number().nonnegative(),
  fiberG: z.coerce.number().nonnegative().nullable().optional(),
  weightTargetKg: z.coerce.number().positive().nullable().optional(),
  weeklyRateMinKg: z.coerce.number().nullable().optional(),
  weeklyRateMaxKg: z.coerce.number().nullable().optional(),
  source: z.enum(["manual", "onboarding", "ai_suggestion"]).default("manual"),
});
export type ChangeGoalInput = z.infer<typeof changeGoalSchema>;

/**
 * Section 51: never overwrites the past. Closes the currently-open goal
 * as of yesterday and opens a new one starting today, so historical
 * stats keep using whatever goal was actually in force at the time.
 */
export async function applyGoalChange(input: ChangeGoalInput) {
  const parsed = changeGoalSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: current } = await supabase
    .from("nutrition_goals")
    .select("*")
    .eq("user_id", user.id)
    .is("effective_to", null)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  if (current) {
    const { error } = await supabase
      .from("nutrition_goals")
      .update({ effective_to: yesterday >= current.effective_from ? yesterday : current.effective_from })
      .eq("id", current.id);
    if (error) throw error;
  }

  const { error: insertError } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    mode: parsed.mode ?? current?.mode ?? "maintain",
    kcal: Math.round(parsed.kcal),
    protein_g: parsed.proteinG,
    carbohydrates_g: parsed.carbohydratesG,
    fat_g: parsed.fatG,
    fiber_g: parsed.fiberG ?? null,
    weight_target_kg: parsed.weightTargetKg ?? current?.weight_target_kg ?? null,
    weekly_rate_min_kg: parsed.weeklyRateMinKg ?? current?.weekly_rate_min_kg ?? null,
    weekly_rate_max_kg: parsed.weeklyRateMaxKg ?? current?.weekly_rate_max_kg ?? null,
    source: parsed.source,
    effective_from: today,
  });
  if (insertError) throw insertError;

  revalidatePath("/");
  revalidatePath("/ia");
  revalidatePath("/ajustes");
}
