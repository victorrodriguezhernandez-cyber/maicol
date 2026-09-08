import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/settings/SetPasswordForm";

export default async function SeguridadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Seguridad y acceso</h1>
      <p className="text-xs text-[var(--text-secondary)]">
        Cuenta: {user.email}
      </p>
      <SetPasswordForm />
    </div>
  );
}
