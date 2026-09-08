"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  displayName: z.string().nullable().optional(),
  heightCm: z.coerce.number().positive().nullable().optional(),
});

export async function updateProfile(input: z.infer<typeof updateProfileSchema>) {
  const parsed = updateProfileSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.displayName ?? null, height_cm: parsed.heightCm ?? null })
    .eq("id", user.id);
  if (error) throw error;
  revalidatePath("/ajustes/perfil");
}

const updatePreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  weightUnit: z.enum(["kg", "lb"]),
  timeFormat: z.enum(["24h", "12h"]),
  startOfWeek: z.coerce.number().min(0).max(6),
});

export async function updatePreferences(input: z.infer<typeof updatePreferencesSchema>) {
  const parsed = updatePreferencesSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("user_preferences")
    .update({
      theme: parsed.theme,
      weight_unit: parsed.weightUnit,
      time_format: parsed.timeFormat,
      start_of_week: parsed.startOfWeek,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/ajustes/perfil");
}
