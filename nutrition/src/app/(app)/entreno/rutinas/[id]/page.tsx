import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRoutineWithDays } from "@/lib/data/training";
import { RoutineEditor } from "@/components/training/RoutineEditor";

export default async function RutinaPage({
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

  const routine = await getRoutineWithDays(supabase, id);
  // RLS ya filtra por usuario, así que "no existe" también cubre "no es
  // tuya" sin decir cuál de las dos.
  if (!routine) notFound();

  return <RoutineEditor routine={routine} />;
}
