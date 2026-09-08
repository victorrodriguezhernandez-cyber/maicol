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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Ajustes</h1>
      <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>

      <ul className="flex flex-col gap-1.5">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
            >
              {link.label}
              <span className="text-[var(--text-secondary)]">›</span>
            </Link>
          </li>
        ))}
        <li>
          <a
            href="/api/export?format=json"
            className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            Exportar mis datos (JSON)
            <span className="text-[var(--text-secondary)]">↓</span>
          </a>
        </li>
        <li>
          <a
            href="/api/export?format=csv"
            className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            Exportar mis datos (CSV)
            <span className="text-[var(--text-secondary)]">↓</span>
          </a>
        </li>
      </ul>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)]">
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
