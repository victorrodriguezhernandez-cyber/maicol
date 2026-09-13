import { redirect } from "next/navigation";
import { getUser, createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/training/ExerciseForm";
import { PageShell } from "@/components/ui/PageShell";

export const metadata = { title: "Nuevo ejercicio" };

export default async function NuevoEjercicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  return (
    <PageShell eyebrow="Tu catálogo" title="Nuevo ejercicio">
      <ExerciseForm />
    </PageShell>
  );
}
