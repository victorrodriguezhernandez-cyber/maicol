"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const addWeightSchema = z.object({
  measuredAt: z.string(),
  weightKg: z.coerce.number().positive(),
  isUsualConditions: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export async function addWeightEntry(input: z.infer<typeof addWeightSchema>) {
  const parsed = addWeightSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("weight_entries").insert({
    user_id: user.id,
    measured_at: parsed.measuredAt,
    weight_kg: parsed.weightKg,
    is_usual_conditions: parsed.isUsualConditions,
    notes: parsed.notes ?? null,
  });
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/progreso");
}

const setWeightEntryForDateSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  weightKg: z.coerce.number().positive(),
});
export type SetWeightEntryForDateInput = z.infer<typeof setWeightEntryForDateSchema>;

/**
 * Used by the Coach IA's "update_weight_entry" action: if a weigh-in
 * already exists that calendar date, corrects its value in place (keeping
 * the original time-of-day and is_usual_conditions); otherwise creates one
 * at noon, tagged as not-usual-conditions since it's a backfilled value
 * rather than this user's own morning routine weigh-in. Returns the prior
 * value so the caller can offer an undo.
 */
export async function setWeightEntryForDate(input: SetWeightEntryForDateInput) {
  const parsed = setWeightEntryForDateSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const dayStart = `${parsed.date}T00:00:00`;
  const dayEnd = `${parsed.date}T23:59:59.999`;

  const { data: existing } = await supabase
    .from("weight_entries")
    .select("id, weight_kg")
    .eq("user_id", user.id)
    .gte("measured_at", dayStart)
    .lte("measured_at", dayEnd)
    .order("measured_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("weight_entries")
      .update({ weight_kg: parsed.weightKg })
      .eq("id", existing.id);
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/progreso");
    return { id: existing.id as string, created: false, previousWeightKg: existing.weight_kg as number };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("weight_entries")
    .insert({
      user_id: user.id,
      measured_at: `${parsed.date}T12:00:00`,
      weight_kg: parsed.weightKg,
      is_usual_conditions: false,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  revalidatePath("/");
  revalidatePath("/progreso");
  return { id: inserted.id as string, created: true, previousWeightKg: null as number | null };
}

export async function deleteWeightEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/progreso");
  revalidatePath("/");
}

const addMeasurementSchema = z.object({
  measuredAt: z.string(),
  measurementType: z.enum(["waist", "chest", "arm", "thigh", "hip", "neck", "custom"]),
  customLabel: z.string().nullable().optional(),
  valueCm: z.coerce.number().positive(),
  notes: z.string().nullable().optional(),
});

export async function addMeasurement(input: z.infer<typeof addMeasurementSchema>) {
  const parsed = addMeasurementSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("body_measurements").insert({
    user_id: user.id,
    measured_at: parsed.measuredAt,
    measurement_type: parsed.measurementType,
    custom_label: parsed.customLabel ?? null,
    value_cm: parsed.valueCm,
    notes: parsed.notes ?? null,
  });
  if (error) throw error;
  revalidatePath("/progreso/medidas");
}

export async function deleteMeasurement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/progreso/medidas");
}

const createProgressPhotoSchema = z.object({
  takenAt: z.string(),
  category: z.enum(["front", "side", "back", "free"]),
  storagePath: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export async function createProgressPhotoRecord(input: z.infer<typeof createProgressPhotoSchema>) {
  const parsed = createProgressPhotoSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("progress_photos").insert({
    user_id: user.id,
    taken_at: parsed.takenAt,
    category: parsed.category,
    storage_path: parsed.storagePath,
    notes: parsed.notes ?? null,
  });
  if (error) throw error;
  revalidatePath("/progreso/fotos");
}

export async function deleteProgressPhoto(id: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("progress-images").remove([storagePath]);
  const { error } = await supabase.from("progress_photos").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/progreso/fotos");
}
