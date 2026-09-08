import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/settings/SignOutButton";

const LINKS = [
  { href: "/ajustes/objetivos", label: "Objetivos nutricionales" },
  { href: "/ajustes/perfil", label: "Perfil y preferencias" },
  { href: "/ajustes/alimentos", label: "Biblioteca de alimentos" },
  { href: "/recetas", label: "Recetas" },
] as const;

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full btn-primary text-sm font-semibold">
          {initial}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Ajustes</h1>
          <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="tap-row flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)]"
            >
              {link.label}
              <ChevronIcon />
            </Link>
          </li>
        ))}
      </ul>

      <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
        <li>
          <a
            href="/api/export?format=json"
            className="tap-row flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            Exportar mis datos (JSON)
            <DownloadIcon />
          </a>
        </li>
        <li>
          <a
            href="/api/export?format=csv"
            className="tap-row flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            Exportar mis datos (CSV)
            <DownloadIcon />
          </a>
        </li>
      </ul>

      <div className="glass-panel rounded-2xl p-4 text-xs text-[var(--text-secondary)]">
        <p className="mb-1 font-medium text-[var(--text-primary)]">Privacidad e IA</p>
        <p>
          Las fotografías de comida y etiquetas se envían a Gemini para analizarlas cuando tú lo
          solicitas. Las fotografías de progreso son privadas y nunca se envían a la IA. Los audios
          de voz se procesan y se descartan de inmediato.
        </p>
      </div>

      <SignOutButton />
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
      <path
        d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
