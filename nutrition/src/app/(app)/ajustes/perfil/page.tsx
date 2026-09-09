import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { PageShell } from "@/components/ui/PageShell";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
  ]);

  return (
    <PageShell title="Perfil y preferencias">
      <PreferencesForm
        displayName={profile?.display_name ?? null}
        heightCm={profile?.height_cm ?? null}
        theme={preferences?.theme ?? "system"}
        weightUnit={preferences?.weight_unit ?? "kg"}
        timeFormat={preferences?.time_format ?? "24h"}
        startOfWeek={preferences?.start_of_week ?? 1}
      />
    </PageShell>
  );
}
