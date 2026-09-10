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
        className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-40 bg-[var(--app-bg)]/75 backdrop-blur-2xl"
        style={{ boxShadow: "0 -1px 0 0 var(--border-soft), 0 -8px 24px hsl(var(--shadow-color) / 0.12)" }}
        aria-label="Navegación principal"
      >
        <div className="relative mx-auto flex max-w-lg items-center justify-between px-2">
          {/* The FAB's own glow, bleeding into the bar so it reads as
              welded to the navigation rather than a circle floating on
              top of it. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-16 w-24 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: "radial-gradient(closest-side, var(--accent-glow), transparent)",
              filter: "blur(6px)",
            }}
          />

          {TABS.map((tab) => (
            <NavItem key={tab.href} tab={tab} active={pathname === tab.href} />
          ))}

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="tap-scale relative flex flex-col items-center px-3 py-2"
            aria-label="Registrar"
          >
            <span
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full text-[var(--accent-fg)]"
              style={{
                background: "linear-gradient(150deg, var(--accent-2), var(--accent) 78%)",
                boxShadow:
                  "0 1px 0 0 color-mix(in srgb, white 30%, transparent) inset, 0 0 0 5px var(--app-bg), var(--shadow-md)",
              }}
            >
              <PlusIcon size={23} strokeWidth={2.2} />
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
    <Link href={tab.href} className="tap-scale relative flex flex-col items-center gap-1 px-4 py-3">
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-1 top-1 bottom-1 rounded-2xl"
          style={{ background: "var(--accent-soft)" }}
        />
      ) : null}
      <Icon size={20} className={`relative ${active ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`} />
      <span
        className={`relative text-[10px] font-semibold ${active ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}`}
      >
        {tab.label}
      </span>
    </Link>
  );
}
