"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const setDayStatusSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (se espera YYYY-MM-DD)"),
  status: z.enum(["complete", "partial", "not_logged"]),
});

export async function setDayStatus(
  date: string,
  status: "complete" | "partial" | "not_logged",
) {
  const parsed = setDayStatusSchema.parse({ date, status });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("day_logs")
    .upsert(
      {
        user_id: user.id,
        log_date: parsed.date,
        status: parsed.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" },
    );
  if (error) throw error;
  revalidatePath(`/diario/${parsed.date}`);
  revalidatePath("/diario");
}
