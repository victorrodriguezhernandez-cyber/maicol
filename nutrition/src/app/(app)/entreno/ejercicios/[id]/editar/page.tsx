import { notFound, redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getExercise } from "@/lib/data/training";
import { ExerciseForm } from "@/components/training/ExerciseForm";
import { PageShell } from "@/components/ui/PageShell";

export const metadata = { title: "Editar ejercicio" };

export default async function EditarEjercicioPage({
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

  const exercise = await getExercise(supabase, id);
  if (!exercise) notFound();
  // Los del catálogo compartido no se editan (RLS tampoco lo permitiría);
  // mejor no enseñar un formulario que va a fallar al guardar.
  if (exercise.user_id !== user.id) notFound();

  return (
    <PageShell eyebrow="Tu catálogo" title={exercise.name}>
      <ExerciseForm exercise={exercise} />
    </PageShell>
  );
}
