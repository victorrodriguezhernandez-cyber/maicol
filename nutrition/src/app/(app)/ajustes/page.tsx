import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  ScaleIcon,
  UserIcon,
  LockIcon,
  FoodIcon,
  BookIcon,
  UploadIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";

const ACCOUNT_LINKS = [
  { href: "/ajustes/objetivos", label: "Objetivos nutricionales", icon: ScaleIcon },
  { href: "/ajustes/perfil", label: "Perfil y preferencias", icon: UserIcon },
  { href: "/ajustes/seguridad", label: "Seguridad y acceso", icon: LockIcon },
] as const;

const LIBRARY_LINKS = [
  { href: "/ajustes/alimentos", label: "Biblioteca de alimentos", icon: FoodIcon },
  { href: "/recetas", label: "Recetas", icon: BookIcon },
] as const;

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const initial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <PageShell>
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-[var(--accent-fg)]"
          style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent) 75%)" }}
        >
          {initial}
        </div>
        <div>
          <h1 className="text-hero-title text-xl text-[var(--text-primary)]">Ajustes</h1>
          <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
        </div>
      </div>

      <SettingsGroup label="Cuenta" links={ACCOUNT_LINKS} />
      <SettingsGroup label="Biblioteca" links={LIBRARY_LINKS} />

      <section className="flex flex-col gap-2">
        <SectionHeader>Datos</SectionHeader>
        <div className="surface-soft flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
          <a href="/api/export?format=json" className="tap-row flex items-center gap-3 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
              <UploadIcon size={15} />
            </span>
            <span className="flex-1 text-[13.5px] font-medium text-[var(--text-primary)]">
              Exportar mis datos (JSON)
            </span>
            <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </a>
          <a href="/api/export?format=csv" className="tap-row flex items-center gap-3 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
              <UploadIcon size={15} />
            </span>
            <span className="flex-1 text-[13.5px] font-medium text-[var(--text-primary)]">
              Exportar mis datos (CSV)
            </span>
            <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </a>
        </div>
      </section>

      <div className="surface-soft p-4 text-xs text-[var(--text-secondary)]">
        <p className="mb-1 text-[13px] font-semibold text-[var(--text-primary)]">Privacidad e IA</p>
        <p>
          Las fotografías de comida y etiquetas se envían a Gemini para analizarlas cuando tú lo
          solicitas. Las fotografías de progreso son privadas y nunca se envían a la IA. Los audios
          de voz se procesan y se descartan de inmediato.
        </p>
      </div>

      <SignOutButton />
    </PageShell>
  );
}

function SettingsGroup({
  label,
  links,
}: {
  label: string;
  links: readonly { href: string; label: string; icon: typeof ScaleIcon }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <SectionHeader>{label}</SectionHeader>
      <div className="surface-soft flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="tap-row flex items-center gap-3 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
              <link.icon size={15} />
            </span>
            <span className="flex-1 text-[13.5px] font-medium text-[var(--text-primary)]">{link.label}</span>
            <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
