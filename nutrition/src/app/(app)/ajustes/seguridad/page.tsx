import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/settings/SetPasswordForm";
import { PageShell } from "@/components/ui/PageShell";

export default async function SeguridadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  return (
    <PageShell eyebrow={`Cuenta: ${user.email}`} title="Seguridad y acceso">
      <SetPasswordForm />
    </PageShell>
  );
}
