import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { NewRoutineFlow } from "@/components/training/NewRoutineFlow";
import { PageShell } from "@/components/ui/PageShell";

export const metadata = { title: "Nueva rutina" };

export default async function NuevaRutinaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  return (
    <PageShell eyebrow="Cuatro formas de empezar" title="Nueva rutina">
      <NewRoutineFlow />
    </PageShell>
  );
}
