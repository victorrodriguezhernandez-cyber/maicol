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
