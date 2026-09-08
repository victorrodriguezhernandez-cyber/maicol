"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteFood(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("foods").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/ajustes/alimentos");
}
