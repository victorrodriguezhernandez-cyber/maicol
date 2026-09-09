"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RegisterSheet } from "@/components/register/RegisterSheet";
import { HomeIcon, CalendarIcon, TrendIcon, SparkleIcon, PlusIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/", label: "Hoy", icon: HomeIcon },
  { href: "/diario", label: "Diario", icon: CalendarIcon },
] as const;
const TABS_RIGHT = [
  { href: "/progreso", label: "Progreso", icon: TrendIcon },
  { href: "/ia", label: "IA", icon: SparkleIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <>
      <nav
        className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-[var(--app-bg)]/85 backdrop-blur-2xl"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-3">
          {TABS.map((tab) => (
            <NavItem key={tab.href} tab={tab} active={pathname === tab.href} />
          ))}

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="tap-scale flex flex-col items-center gap-1 px-3 py-2"
            aria-label="Registrar"
          >
            <span
              className="-mt-7 flex h-[52px] w-[52px] items-center justify-center rounded-full text-[var(--accent-fg)]"
              style={{
                background: "linear-gradient(135deg, var(--accent-2), var(--accent) 75%)",
                boxShadow: "0 1px 0 0 color-mix(in srgb, white 25%, transparent) inset, var(--shadow-md)",
              }}
            >
              <PlusIcon size={24} strokeWidth={2.1} />
            </span>
          </button>

          {TABS_RIGHT.map((tab) => (
            <NavItem key={tab.href} tab={tab} active={pathname === tab.href} />
          ))}
        </div>
      </nav>

      <RegisterSheet open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  );
}

function NavItem({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof HomeIcon };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link href={tab.href} className="tap-scale relative flex flex-col items-center gap-1 px-3 py-2.5">
      {active ? (
        <span
          aria-hidden="true"
          className="absolute top-1 h-7 w-7 rounded-full"
          style={{ background: "var(--accent-soft)" }}
        />
      ) : null}
      <Icon
        size={21}
        className={`relative ${active ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`}
      />
      <span
        className={`relative text-[10.5px] font-semibold ${
          active ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}
