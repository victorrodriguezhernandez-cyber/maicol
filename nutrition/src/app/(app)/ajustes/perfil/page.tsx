import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PreferencesForm } from "@/components/settings/PreferencesForm";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Perfil y preferencias</h1>
      <PreferencesForm
        displayName={profile?.display_name ?? null}
        heightCm={profile?.height_cm ?? null}
        theme={preferences?.theme ?? "system"}
        weightUnit={preferences?.weight_unit ?? "kg"}
        timeFormat={preferences?.time_format ?? "24h"}
        startOfWeek={preferences?.start_of_week ?? 1}
      />
    </div>
  );
}
