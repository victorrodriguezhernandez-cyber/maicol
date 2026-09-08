"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  sex: z.enum(["male", "female", "unspecified"]),
  birthDate: z.string().min(1),
  heightCm: z.coerce.number().min(100).max(250),
  currentWeightKg: z.coerce.number().min(30).max(300),
  mode: z.enum(["maintain", "lose", "gain"]),
  weeklyRateMinKg: z.coerce.number(),
  weeklyRateMaxKg: z.coerce.number(),
  targetWeightKg: z.coerce.number().min(30).max(300).optional().or(z.literal("")),
  kcal: z.coerce.number().min(800).max(6000),
  proteinG: z.coerce.number().min(0).max(500),
  carbohydratesG: z.coerce.number().min(0).max(900),
  fatG: z.coerce.number().min(0).max(400),
  fiberG: z.coerce.number().min(0).max(100).optional(),
});

export async function completeOnboarding(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = onboardingSchema.parse(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      sex: parsed.sex,
      birth_date: parsed.birthDate,
      height_cm: parsed.heightCm,
    })
    .eq("id", user.id);
  if (profileError) throw profileError;

  const { error: weightError } = await supabase.from("weight_entries").insert({
    user_id: user.id,
    measured_at: new Date().toISOString(),
    weight_kg: parsed.currentWeightKg,
    is_usual_conditions: true,
  });
  if (weightError) throw weightError;

  const { error: goalError } = await supabase.from("nutrition_goals").insert({
    user_id: user.id,
    mode: parsed.mode,
    kcal: Math.round(parsed.kcal),
    protein_g: parsed.proteinG,
    carbohydrates_g: parsed.carbohydratesG,
    fat_g: parsed.fatG,
    fiber_g: parsed.fiberG ?? null,
    weight_target_kg: parsed.targetWeightKg === "" ? null : parsed.targetWeightKg,
    weekly_rate_min_kg: parsed.weeklyRateMinKg,
    weekly_rate_max_kg: parsed.weeklyRateMaxKg,
    source: "onboarding",
  });
  if (goalError) throw goalError;

  redirect("/");
}
