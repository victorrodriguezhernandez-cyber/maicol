import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { searchExercises } from "@/lib/data/training";
import { isMuscleGroup } from "@/lib/training/muscles";
import { ExerciseCatalog } from "@/components/training/ExerciseCatalog";
import { PageShell } from "@/components/ui/PageShell";
import { PlusIcon } from "@/components/ui/icons";

export const metadata = { title: "Ejercicios" };

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ musculo?: string }>;
}) {
  const { musculo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const initialMuscle = musculo && isMuscleGroup(musculo) ? musculo : null;

  // La primera lista se pinta en el servidor para que la pantalla llegue
  // llena; a partir de ahí filtra el cliente contra /api/exercises/search.
  const exercises = await searchExercises(
    supabase,
    initialMuscle ? { muscle: initialMuscle } : {},
    120,
  );

  return (
    <PageShell
      eyebrow="Catálogo e historial"
      title="Ejercicios"
      trailing={
        <Link href="/entreno/ejercicios/nuevo" className="btn-pill text-xs">
          <PlusIcon size={13} /> Nuevo
        </Link>
      }
    >
      <ExerciseCatalog initialExercises={exercises} initialMuscle={initialMuscle} />
    </PageShell>
  );
}
