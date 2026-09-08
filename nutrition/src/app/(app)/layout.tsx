import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/nav/BottomNav";
import { formatDateHeader } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const initial = (profile?.display_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top safe-x sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--app-bg)]/90 px-4 py-3 backdrop-blur">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {formatDateHeader(new Date())}
        </p>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-primary)]"
        >
          {initial}
        </Link>
      </header>

      <main className="safe-x mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-3">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
