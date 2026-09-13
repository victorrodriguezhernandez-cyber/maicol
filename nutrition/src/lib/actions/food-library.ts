"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const deleteFoodSchema = z.object({ id: z.string().uuid() });

export async function deleteFood(id: string) {
  const parsed = deleteFoodSchema.parse({ id });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("foods").delete().eq("id", parsed.id);
  if (error) throw error;
  revalidatePath("/ajustes/alimentos");
}
