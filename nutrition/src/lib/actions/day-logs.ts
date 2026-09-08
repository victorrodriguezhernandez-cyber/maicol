"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setDayStatus(
  date: string,
  status: "complete" | "partial" | "not_logged",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("day_logs")
    .upsert(
      { user_id: user.id, log_date: date, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,log_date" },
    );
  if (error) throw error;
  revalidatePath(`/diario/${date}`);
  revalidatePath("/diario");
}
