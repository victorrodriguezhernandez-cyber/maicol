import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getProfileDisplayName } from "@/lib/data/nutrition";
import { BottomNav } from "@/components/nav/BottomNav";
import { Logo } from "@/components/ui/Logo";
import { formatDateHeader } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);

  if (!user) redirect("/login");

  const displayName = await getProfileDisplayName(supabase, user.id);
  const initial = (displayName?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top safe-x sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--app-bg)]/85 px-4 py-2.5 backdrop-blur-2xl">
        <Logo />
        <div className="flex items-center gap-3">
          <p className="hidden text-xs font-medium text-[var(--text-tertiary)] sm:block">
            {formatDateHeader(new Date())}
          </p>
          <Link
            href="/ajustes"
            aria-label="Ajustes"
            className="tap-scale flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--accent-fg)]"
            style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent) 75%)" }}
          >
            {initial}
          </Link>
        </div>
      </header>

      <main className="safe-x mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>

      <BottomNav />
    </div>
  );
}
