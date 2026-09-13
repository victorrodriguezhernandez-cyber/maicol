import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getSessionDetail } from "@/lib/data/training";
import { SessionLogger } from "@/components/training/SessionLogger";
import { SessionSummary } from "@/components/training/SessionSummary";

export const metadata = { title: "Entreno" };

export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const detail = await getSessionDetail(supabase, id);
  // RLS ya habría devuelto vacío para una sesión ajena, así que "no
  // encontrada" cubre también "no es tuya" sin revelar cuál de las dos es.
  if (!detail) notFound();

  // Una sesión cerrada no se registra, se lee: son dos pantallas
  // distintas porque son dos cosas distintas. Mezclarlas en una con
  // campos deshabilitados dejaría una pantalla que no es ni una ni otra.
  if (detail.session.status !== "en_curso") {
    return <SessionSummary session={detail.session} exercises={detail.exercises} />;
  }

  return <SessionLogger session={detail.session} exercises={detail.exercises} />;
}
