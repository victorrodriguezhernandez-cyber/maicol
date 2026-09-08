"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RegisterSheet } from "@/components/register/RegisterSheet";

const TABS = [
  { href: "/", label: "Hoy", icon: HomeIcon },
  { href: "/diario", label: "Diario", icon: CalendarIcon },
  { href: "/progreso", label: "Progreso", icon: ChartIcon },
  { href: "/ia", label: "IA", icon: SparkIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <>
      <nav
        className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-2">
          {TABS.slice(0, 2).map((tab) => (
            <NavItem key={tab.href} tab={tab} active={pathname === tab.href} />
          ))}

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2"
            aria-label="Registrar"
          >
            <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg)] shadow-lg shadow-black/10">
              <PlusIcon />
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Registrar
            </span>
          </button>

          {TABS.slice(2).map((tab) => (
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
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className="flex flex-col items-center gap-1 px-3 py-2.5"
    >
      <Icon
        className={active ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}
      />
      <span
        className={`text-[11px] font-medium ${
          active ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 19.5V4.5M4 19.5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 16l3.5-4 3 2.5L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5c.4 2.6 1 4.1 2 5.1s2.5 1.6 5.1 2c-2.6.4-4.1 1-5.1 2s-1.6 2.5-2 5.1c-.4-2.6-1-4.1-2-5.1s-2.5-1.6-5.1-2c2.6-.4 4.1-1 5.1-2s1.6-2.5 2-5.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
