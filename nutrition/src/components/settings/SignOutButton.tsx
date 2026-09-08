"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="w-full rounded-xl border border-[var(--danger)] py-3 text-sm font-medium text-[var(--danger)] transition-colors duration-150 active:bg-[var(--danger)]/10"
    >
      Cerrar sesión
    </button>
  );
}
